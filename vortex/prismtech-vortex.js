/**
 PrismTech licenses this file to You under the Apache License, Version 2.0
 (the "License"); you may not use this file except in compliance with the
 License and with the PrismTech Vortex product. You may obtain a copy of the
 License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 License and README for the specific language governing permissions and
 limitations under the License.
 **/
module.exports = function (RED) {
    //"use strict";
    var vortex = require("node-vortex");
    var events = require("events");

    function VortexServerNode(n) {
        RED.nodes.createNode(this, n);
        this.host = n.host;
        this.port = n.port;

        // config node state
        this.vortexurl = "";
        this.connected = false;
        this.connecting = false;
        this.usecount = 0;
        this.queue = [];

        if (this.credentials) {
            this.username = this.credentials.user;
            this.password = this.credentials.password;
        }

        // Create the URL to connect to Vortex
        if (this.vortexurl == "") {
            this.vortexurl = "ws://";

            if (this.host != "") {
                this.vortexurl = this.vortexurl + this.host + ":" + this.port;
            } else {
                this.vortexurl = this.vortexurl + "localhost:9000";
            }
        }

        console.warn("[DEBUG] VortexServerNode -- Using url : " + this.vortexurl);
        // Define the functions called by Vortex in and out nodes
        var node = this;
        this.vortex = vortex;
        this.register = function () {
            console.warn("[DEBUG] VortexServerNode -- register");
            node.usecount += 1;
        };

        this.deregister = function () {
            console.warn("[DEBUG] VortexServerNode -- deregister");
            node.usecount -= 1;
            if (node.usecount == 0) {
                node.client.end();
            }
        };

        this.connect = function () {
            console.warn("[DEBUG] VortexServerNode -- connect");
            if (!node.connected && !node.connecting) {
                console.warn("[DEBUG] VortexServerNode -- connecting");
                node.connecting = true;
                console.log("[DEBUG] VortexServerNode -- connecting --> " + vortex.runtime);
                node.client = new vortex.runtime.Runtime();

                node.client.onconnect = function () {
                    console.warn("[DEBUG] VortexServerNode -- onconnect");
                    node.connected = true;
                    node.connecting = false;
                    node.emit('connected');
                };

                node.client.connect(this.vortexurl, "uid:pwd");
            }
        };

    }

    RED.nodes.registerType("prismtech-vortex", VortexServerNode, {
        credentials: {
            user: {type: "text"},
            password: {type: "password"}
        }
    });

    function ConfigureQos(qosContainer, node) {
        var qos = qosContainer;
        if ((typeof(node.partition) !== 'undefined') && (node.partition !== null)) {
            qos = qos.add(node.vortexConn.vortex.Partition(node.partition));
        }

        if ((typeof(node.history) !== null) && (node.history !== null)) {
            var kind = parseInt(node.history, 10);
            if (kind == node.vortexConn.vortex.HistoryKind.KeepAll) {
                qos = qos.add(node.vortexConn.vortex.History.KeepAll);
            } else {
                qos = qos.add(node.vortexConn.vortex.History.KeepLast(parseInt(node.history_depth, 10)));
            }
        }

        if ((typeof(node.reliability) !== null) && (node.reliability !== null)) {
            var kind = parseInt(node.reliability, 10);
            if (kind == node.vortexConn.vortex.ReliabilityKind.BestEffort) {
                qos = qos.add(node.vortexConn.vortex.Reliability.BestEffort);
            } else {
                qos = qos.add(node.vortexConn.vortex.Reliability.Reliable);
            }
        }

        if ((typeof(node.durability) !== null) && (node.durability !== null)) {
            console.warn("Create durability");
            var kind = parseInt(node.durability, 10);
            if (kind === node.vortexConn.vortex.DurabilityKind.Volatile) {
                qos = qos.add(node.vortexConn.vortex.Durability.Volatile);
            } else if (kind === node.vortexConn.vortex.DurabilityKind.TransientLocal) {
                qos = qos.add(node.vortexConn.vortex.Durability.TransientLocal);
            } else if (kind === node.vortexConn.vortex.DurabilityKind.Transient) {
                qos = qos.add(node.vortexConn.vortex.Durability.Transient);
            } else if (kind === node.vortexConn.vortex.DurabilityKind.Persistent) {
                console.warn("Create durability -- persistent");
                qos = qos.add(node.vortexConn.vortex.Durability.Persistent);
            }
        }


        if ((node.content_filter != undefined) && (typeof(node.content_filter) !== null) && (node.content_filter !== null) && (node.content_filter !== '')) {
            qos = qos.add(node.vortexConn.vortex.ContentFilter(node.content_filter));
        }

        if ((node.time_filter != undefined) && (typeof(node.time_filter) !== null) && (node.time_filter !== null) && (node.time_filter !== '')) {
            qos = qos.add(node.vortexConn.vortex.TimeFilter(node.time_filter));
        }

        return qos;
    }

    function VortexInNode(n) {
        console.warn("[VortexInNode]  -- creating");
        RED.nodes.createNode(this, n);

        this.status({fill: "red", shape: "ring", text: "Unconnected"});

        var topicSplit = n.topic.lastIndexOf('/');
        this.topic = n.topic.substring(topicSplit == 0 ? 0 : topicSplit + 1, n.topic.length);
        this.topicType = n.topicType;
        this.partition = n.topic.substring(0, topicSplit) || null;
        this.domain = parseInt(n.domain) || 0;
        this.history = n.history || null;
        this.history_depth = n.history_depth || null;
        this.reliability = n.reliability || null;
        this.durability = n.durability || null;
        this.content_filter = n.content_filter || null;
        this.time_filter = n.time_filter || null;
        this.vortexServer = n.vortex;
        this.vortexConn = RED.nodes.getNode(this.vortexServer);
        var nodeReader = this;
        var dr = null;


        if (nodeReader.vortexConn) {
            console.warn("[VortexInNode]  -- connecting -- " + nodeReader.vortexConn.vortexurl);
            var listener;
            var createReader = function () {
                var tqos = new nodeReader.vortexConn.vortex.TopicQos(nodeReader.vortexConn.vortex.Reliability.BestEffort);
                console.warn("[VortexInNode]  -- topic -- " + nodeReader.topic + " [" + nodeReader.topicType + "]");
                var tdef =  (nodeReader.topicType == undefined || nodeReader.topicType == '') ?
                    new nodeReader.vortexConn.vortex.Topic(nodeReader.domain, nodeReader.topic, tqos) :
                    new nodeReader.vortexConn.vortex.Topic(nodeReader.domain, nodeReader.topic, tqos, nodeReader.topicType);

                tdef.onregistered = function () {
                    var drQos = new nodeReader.vortexConn.vortex.DataReaderQos();

                    ConfigureQos(drQos, nodeReader);

                    dr = new nodeReader.vortexConn.vortex.DataReader(nodeReader.vortexConn.client, tdef, drQos);

                    listener = dr.addListener(function (data) {
                        var msg = {};
                        msg.payload = data;
                        msg.topic = nodeReader.topicType;
                        nodeReader.send(msg);
                    });

                    dr.onconnect = function () {
                        nodeReader.status({fill: "green", shape: "ring", text: "Connected"});
                    };

                };

                nodeReader.vortexConn.client.registerTopic(tdef);
            };

            if (nodeReader.vortexConn.connected == false) {
                nodeReader.status({fill: "yellow", shape: "ring", text: "Connecting"});
                console.warn("[VortexInNode]  -- connecting");


                nodeReader.vortexConn.on('connected', function () {
                    console.warn("[VortexInNode]  -- createReader");
                    createReader();
                });

                nodeReader.vortexConn.register();
                nodeReader.vortexConn.connect();

                console.warn("[VortexInNode]  -- connected");
            } else {
                nodeReader.status({fill: "green", shape: "ring", text: "Connected"});
                console.warn("[VortexInNode]  -- already connected");
                console.warn("[VortexInNode]  -- createReader");
                createReader();
            }
        }
        else {
        }
        //});

            nodeReader.on("close", function () {
                console.warn("[VortexInNode] -- Close");
                if(dr !== null) {
                        dr.removeListener(listener);
                        dr.close();
                }
            });

    }

    RED.nodes.registerType("prismtech-vortex-in", VortexInNode);

    function VortexOutNode(n) {
        console.warn("[VortexOutNode]  -- creating");
        RED.nodes.createNode(this, n);

        this.status({fill: "red", shape: "ring", text: "Unconnected"});

        var topicSplit = n.topic.lastIndexOf('/');
        this.topic = n.topic.substring(topicSplit == 0 ? 0 : topicSplit + 1, n.topic.length);
        this.topicType = n.topicType;
        this.partition = n.topic.substring(0, topicSplit) || null;
        this.domain = parseInt(n.domain) || 0;
        this.history = n.history || null;
        this.history_depth = n.history_depth || null;
        this.reliability = n.reliability || null;
        this.durability = n.durability || null;
        this.vortexServer = n.vortex;
        this.vortexConn = RED.nodes.getNode(this.vortexServer);
        var dw = null;
        var nodeWriter = this;
        var connected = false;
        nodeWriter.setMaxListeners(1);

        nodeWriter.on('input', function (msg) {
            if(nodeWriter.connected) {
                console.log(msg.payload);
                dw.write(msg.payload);
            } else {
                //if (msg.topic == 'connect' && msg.payload == 'on') {
                if (nodeWriter.vortexConn) {
                    console.warn("[VortexOutNode]  -- connecting -- " + nodeWriter.vortexConn.vortexurl);

                    var createWriter = function () {
                        var tqos = new nodeWriter.vortexConn.vortex.TopicQos(nodeWriter.vortexConn.vortex.Reliability.BestEffort);
                        console.warn("[VortexOutNode]  -- topic -- " + nodeWriter.topic + " [" + nodeWriter.topicType + "]");
                        var tdef = (nodeWriter.topicType == undefined || nodeWriter.topicType == '') ?
                            new nodeWriter.vortexConn.vortex.Topic(nodeWriter.domain, nodeWriter.topic, tqos) :
                            new nodeWriter.vortexConn.vortex.Topic(nodeWriter.domain, nodeWriter.topic, tqos, nodeWriter.topicType);

                        tdef.onregistered = function () {
                            var dwQos = new nodeWriter.vortexConn.vortex.DataWriterQos();

                            dwQos = ConfigureQos(dwQos, nodeWriter);
                            console.warn("[VortexOutNode]  -- dw qos -- " + JSON.stringify(dwQos));
                            dw = new nodeWriter.vortexConn.vortex.DataWriter(nodeWriter.vortexConn.client, tdef, dwQos);

                            dw.onconnect = function () {
                                nodeWriter.status({fill: "green", shape: "ring", text: "Connected"});
                                nodeWriter.connected = true;
                            };
                        };

                        nodeWriter.vortexConn.client.registerTopic(tdef);
                    };

                    if (nodeWriter.vortexConn.connected == false) {
                        console.warn("[VortexOutNode]  -- connecting");
                        nodeWriter.vortexConn.on('connected', function () {
                            console.warn("[VortexOutNode]  -- createWriter");
                            createWriter();
                        });

                        nodeWriter.vortexConn.register();
                        nodeWriter.vortexConn.connect();
                        console.warn("[VortexOutNode]  -- connected");
                    } else {
                        console.warn("[VortexOutNode]  -- already connected");
                        console.warn("[VortexOutNode]  -- createWriter");
                        createWriter();
                    }
                }
            }
        });

        nodeWriter.on("close", function () {
            console.warn("[VortexOutNode] -- Close");
            nodeWriter.connected = false;
            if(dw !== null) {
                dw.close();
            }
            nodeWriter.removeAllListeners();
        });
    }

    RED.nodes.registerType("prismtech-vortex-out", VortexOutNode);
}
