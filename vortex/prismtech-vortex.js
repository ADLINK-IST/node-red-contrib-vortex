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
module.exports = function(RED) {
    //"use strict";
    var vortex = require("node-vortex");
    var events = require("events");
    var util = require("util");

    function VortexServerNode(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port;

        // config node state
        this.vortexurl = "";
        this.connected = false;
        this.connecting = false;
        this.usecount = 0;
        this.queue = [];

        events.EventEmitter.call(this);

        if(this.credentials) {
            this.username = this.credentials.user;
            this.password = this.credentials.password;
        }

        // Create the URL to connect to Vortex
        if(this.vortexurl == "") {
            this.vortexurl = "ws://";

            if(this.host != "") {
                this.vortexurl = this.vortexurl+this.host+":"+this.port;
            } else {
                this.vortexurl = this.vortexurl+"localhost:9000";
            }
        }

        console.warn("[DEBUG] VortexServerNode -- Using url : "+this.vortexurl);
        // Define the functions called by Vortex in and out nodes
        var node = this;
        this.vortex = vortex;
        this.register = function() {
            console.warn("[DEBUG] VortexServerNode -- register");
            node.usecount += 1;
        };

        this.deregister = function() {
            console.warn("[DEBUG] VortexServerNode -- deregister");
            node.usecount -= 1;
            if(node.usecount == 0) {
                node.client.end();
            }
        };

        this.connect = function() {
            console.warn("[DEBUG] VortexServerNode -- connect");
          if(!node.connected && !node.connecting){
              console.warn("[DEBUG] VortexServerNode -- connecting");
              node.connecting = true;
              console.log("[DEBUG] VortexServerNode -- connecting --> " + vortex.runtime);
              node.client = new vortex.runtime.Runtime();

              node.client.onconnect = function() {
                  console.warn("[DEBUG] VortexServerNode -- onconnect");
                  node.connected = true;
                  node.connecting = false;
                  node.emit('connected');
              };

              node.client.connect(this.vortexurl, "uid:pwd");
          }
        };

    }
    util.inherits(VortexServerNode, events.EventEmitter);
    RED.nodes.registerType("prismtech-vortex", VortexServerNode,{
        credentials: {
            user: {type:"text"},
            password: {type:"password"}
        }
    });

    function ConfigureQos(qosContainer, node) {
        if((typeof(node.partition) !== 'undefined') && (node.partition !== null)) {
            qosContainer.add(node.vortexConn.vortex.Partition(node.partition));
        }

        if((typeof(node.history) !== null) && (node.history !== null)) {
            var kind = parseInt(node.history, 10);
            if(kind == node.vortexConn.vortex.HistoryKind.KeepAll) {
                qosContainer.add(node.vortexConn.vortex.History.KeepAll);
            } else {
                qosContainer.add(node.vortexConn.vortex.History.KeepLast(parseInt(node.history_depth, 10)));
            }
        }

        if((typeof(node.reliability) !== null) && (node.reliability !== null)) {
            var kind = parseInt(node.reliability, 10);
            if(kind == node.vortexConn.vortex.ReliabilityKind.BestEffort) {
                qosContainer.add(node.vortexConn.vortex.Reliability.BestEffort);
            } else {
                qosContainer.add(node.vortexConn.vortex.Reliability.Reliable);
            }
        }

        if((typeof(node.content_filter) !== null) && (node.content_filter !== null)) {
            qosContainer.add(node.vortexConn.vortex.ContentFilter(node.content_filter));
        }

        if((typeof(node.time_filter) !== null) && (node.time_filter !== null)) {
            qosContainer.add(node.vortexConn.vortex.TimeFilter(node.time_filter));
        }
    }

    function VortexInNode(n) {
        console.warn("[VortexInNode]  -- creating");
        RED.nodes.createNode(this,n);
        var topicSplit = n.topic.lastIndexOf('/');
        this.topic = n.topic.substring(topicSplit == 0 ? 0 : topicSplit + 1, n.topic.length);
        this.partition = n.topic.substring(0,topicSplit) || null;
        this.domain = parseInt(n.domain) || 0;
        this.history = n.history || null;
        this.history_depth = n.history_depth || null;
        this.reliability = n.reliability || null;
        this.content_filter = n.content_filter || null;
        this.time_filter = n.time_filter || null;
        this.vortexServer = n.vortex;
        this.vortexConn = RED.nodes.getNode(this.vortexServer);

        if(this.vortexConn) {
            console.warn("[VortexInNode]  -- connecting -- " + JSON.stringify(this.vortexConn));
            var node = this;
            var createReader = function() {
                var tqos = new node.vortexConn.vortex.TopicQos(node.vortexConn.vortex.Reliability.BestEffort);
                console.warn("[VortexInNode]  -- topic -- " + node.topic);
                var tdef = new node.vortexConn.vortex.Topic(node.domain, node.topic, tqos);

                tdef.onregistered = function() {
                    var drQos = new node.vortexConn.vortex.DataReaderQos();

                    ConfigureQos(drQos, node);

                    var dr = new node.vortexConn.vortex.DataReader(node.vortexConn.client, tdef, drQos);

                    dr.onconnect = function() {
                        node.status({fill:"green", shape:"ring", text:"Connected"});

                        dr.addListener(function(data){
                            console.log(JSON.stringify(data));
                            var msg = {};
                            msg.payload = data;
                            node.send(msg);
                        });
                    };

                };

                node.vortexConn.client.registerTopic(tdef);
            };

            if(this.vortexConn.connected == false) {
                console.warn("[VortexInNode]  -- connecting");


                node.vortexConn.on('connected', function() {
                    console.warn("[VortexInNode]  -- createReader");
                    createReader();
                });

                node.vortexConn.register();
                node.vortexConn.connect();

                console.warn("[VortexInNode]  -- connected");
            } else {
                console.warn("[VortexInNode]  -- already connected");
                console.warn("[VortexInNode]  -- createReader");
                createReader();
            }



        }
    }
    RED.nodes.registerType("prismtech-vortex-in", VortexInNode);

    function VortexOutNode(n) {
        console.warn("[VortexOutNode]  -- creating");
        RED.nodes.createNode(this,n);
        var topicSplit = n.topic.lastIndexOf('/');
        this.topic = n.topic.substring(topicSplit == 0 ? 0 : topicSplit + 1, n.topic.length);
        this.partition = n.topic.substring(0,topicSplit) || null;
        this.domain = parseInt(n.domain) || 0;
        this.history = n.history || null;
        this.history_depth = n.history_depth || null;
        this.reliability = n.reliability || null;
        this.vortexServer = n.vortex;
        this.vortexConn = RED.nodes.getNode(this.vortexServer);

        if(this.vortexConn) {
            console.warn("[VortexOutNode]  -- connecting -- " + JSON.stringify(this.vortexConn));
            var node = this;
            var createWriter = function() {
                var tqos = new node.vortexConn.vortex.TopicQos(node.vortexConn.vortex.Reliability.BestEffort);
                console.warn("[VortexOutNode]  -- topic -- " + node.topic);
                var tdef = new node.vortexConn.vortex.Topic(node.domain, node.topic, tqos);

                tdef.onregistered = function() {
                    var dwQos = new node.vortexConn.vortex.DataWriterQos();

                    ConfigureQos(dwQos, node);

                    var dw = new node.vortexConn.vortex.DataWriter(node.vortexConn.client, tdef, dwQos);

                    dw.onconnect = function() {
                        node.status({fill:"green", shape:"ring", text:"Connected"});
                    };

                    node.on("input", function(msg){
                        dw.write(msg.payload);
                    });
                };

                node.vortexConn.client.registerTopic(tdef);
            };

            if(this.vortexConn.connected == false) {
                console.warn("[VortexOutNode]  -- connecting");
                node.vortexConn.on('connected', function() {
                    console.warn("[VortexInNode]  -- createWriter");
                    createWriter();
                });

                node.vortexConn.register();
                node.vortexConn.connect();
                console.warn("[VortexOutNode]  -- connected");
            } else {
                console.warn("[VortexOutNode]  -- already connected");
                console.warn("[VortexOutNode]  -- createWriter");
                createWriter();
            }
        }
    }
    RED.nodes.registerType("prismtech-vortex-out", VortexOutNode);
}