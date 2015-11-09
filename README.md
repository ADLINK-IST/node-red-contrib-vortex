# node-red-node-vortex
Node-RED nodes for publishing data to and subscribing to data from PrismTech Vortex

# Installing
## Clone node-vortex
Clone the https://github.com/PrismTech/node-vortex repository.
Install node module locally from source
```bash
npm link node-vortex
``` 

## Add the Vortex nodes to Node-RED
In your Node-RED settings.js file set teh nodesDir property to this directory.

## Run Node-RED
```bash
node red.js -v
```

Open your browser to localhost:1880/#

# Using
## Nodes
There are three types of nodes 
* a config node; 
* Vortex In an input node; and 
* Vortex Out an output node.

### Vortex In
[PrismTech](http://www.prismtech.com) [Vortex](http://www.prismtech.com/vortex) input node.
Outputs an object called msg containing msg.payload which is a JSON object.

| Property | Required | Description |
|----------|----------|-------------|
| Vortex | Yes | Reference to the prismtech-vortex config node that you are connecting to. |
| Topic | Yes | The topic that you are interested in. The format of the topic is [<partition>/]?<topic name>. The partition part of the topic is optional. If the partition is being specified then the topic name is whatever is after the last '/'. A partition on an in node can use * to represent a wildcard. |
| Name | No | A user-friendly label that will be used for the node in the flow. If no name is provided then the topic is used. |
| Domain | No | The domain that you are interested in. It is an integer value. |
| Reliability | No | *Reliable* the service will attempt to deliver all samples in its history. *Best Effort* it is acceptable that the service not retry sending samples. |
| History | No | *Keep last* implies that you are only interested in keeping the latest <depth> values of an instance and older ones are discarded. *Keep all* implies that you are interested in keeping and getting all the values of an instance. |
| Depth | No | The number of samples per instance to keep when using keep last history. |
| Content filter | No | It is a way to provide a content-based subscription. It indicates that you do not want to receive all instances or values of the Topic, but rather a subset of them that satisfy some criteria, expressed in JavaScript. |
| Time filter | No | Indicates that you want receive at most one sample every <this value> milliseconds period per instance. |

### Vortex Out
[PrismTech](http://www.prismtech.com) [Vortex](http://www.prismtech.com/vortex) output node.
Input is an object called msg containing msg.payload which is a JSON object to be written to Vortex.

| Property | Required | Description |
|----------|----------|-------------|
| Vortex | Yes | Reference to the prismtech-vortex config node that you are connecting to. |
| Topic | Yes | The topic that you are interested in. The format of the topic is [<partition>/]?<topic name>. The partition part of the topic is optional. If the partition is being specified then the topic name is whatever is after the last '/'. A partition on an in node can use * to represent a wildcard. |
| Name | No | A user-friendly label that will be used for the node in the flow. If no name is provided then the topic is used. |
| Domain | No | The domain that you are interested in. It is an integer value. |
| Reliability | No | *Reliable* the service will attempt to deliver all samples in its history. *Best Effort* it is acceptable that the service not retry sending samples. |
| History | No | *Keep last* implies that you are only interested in keeping the latest <depth> values of an instance and older ones are discarded. *Keep all* implies that you are interested in keeping and getting all the values of an instance. |
| Depth | No | The number of samples per instance to keep when using keep last history. |

## Example using Vortex data in a Function node
```javascript
// Get the latitude and longitude from the Vortex data
var lat1 = msg.payload.d.lat;
var lon1 = msg.payload.d.lng;
// Big Ben in the UK
var lat2 = 51.5007733;
var lon2 = -0.1246402;
var radlat1 = Math.PI * lat1/180
var radlat2 = Math.PI * lat2/180
var radlon1 = Math.PI * lon1/180
var radlon2 = Math.PI * lon2/180
var theta = lon1-lon2
var radtheta = Math.PI * theta/180
var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
dist = Math.acos(dist)
dist = dist * 180/Math.PI
dist = dist * 60 * 1.1515

var newMsg = { "payload": {"dist": dist }};
node.send(newMsg);
```

# Vortex Overview
PrismTech’s Vortex Intelligent Data Sharing Platform provides the leading implementations of the Object Management Group’s Data Distribution Service (DDS) for Real-time Systems standard. DDS is a middleware protocol and API standard for data-centric connectivity and is the only standard able to meet the advanced requirements of the Internet of Things (IoT). DDS provides the low-latency data connectivity, extreme reliability and scalability that business and mission-critical IoT applications need. For more information visit www.prismtech.com/vortex .

# Support
This is a proof of concept/prototype/alpha and is therefore provided as is with no formal support. If you experience an issue or have a question we'll do our best to answer it. In order to help us improve our innovations we would like your feedback and suggestions. Please submit an issue and/or provide suggestions via the GitHub issue tracker or by emailing innovation@prismtech.com.

# License
All use of this source code is subject to the Apache License, Version 2.0. http://www.apache.org/licenses/LICENSE-2.0

“This software is provided as is and for use with PrismTech products only.

DUE TO THE LIMITED NATURE OF THE LICENSE GRANTED, WHICH IS FOR THE LICENSEE’S USE OF THE SOFTWARE ONLY, THE LICENSOR DOES NOT WARRANT TO THE LICENSEE THAT THE SOFTWARE IS FREE FROM FAULTS OR DEFECTS OR THAT THE SOFTWARE WILL MEET LICENSEE’S REQUIREMENTS.  THE LICENSOR SHALL HAVE NO LIABILITY WHATSOEVER FOR ANY ERRORS OR DEFECTS THEREIN.  ACCORDINGLY, THE LICENSEE SHALL USE THE SOFTWARE AT ITS OWN RISK AND IN NO EVENT SHALL THE LICENSOR BE LIABLE TO THE LICENSEE FOR ANY LOSS OR DAMAGE OF ANY KIND (EXCEPT PERSONAL INJURY) OR INABILITY TO USE THE SOFTWARE OR FROM FAULTS OR DEFECTS IN THE SOFTWARE WHETHER CAUSED BY NEGLIGENCE OR OTHERWISE.

IN NO EVENT WHATSOEVER WILL LICENSOR BE LIABLE FOR ANY INDIRECT OR CONSEQUENTIAL LOSS (INCLUDING WITHOUT LIMITATION, LOSS OF USE; DATA; INFORMATION; BUSINESS; PRODUCTION OR GOODWILL), EXEMPLARY OR INCIDENTAL DAMAGES, LOST PROFITS OR OTHER SPECIAL OR PUNITIVE DAMAGES WHATSOEVER, WHETHER IN CONTRACT, TORT, (INCLUDING NEGLIGENCE, STRICT LIABILITY AND ALL OTHERS), WARRANTY, INDEMNITY OR UNDER STATUTE, EVEN IF LICENSOR HAS BEEN ADVISED OF THE LIKLIHOOD OF SAME.

ANY CONDITION, REPRESENTATION OR WARRANTY WHICH MIGHT OTHERWISE BE IMPLIED OR INCORPORATED WITHIN THIS LICENSE BY REASON OF STATUTE OR COMMON LAW OR OTHERWISE, INCLUDING WITHOUT LIMITATION THE IMPLIED WARRANTIES OF MERCHANTABLE OR SATISFACTORY QUALITY AND FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON INFRINGEMENT ARE HEREBY EXPRESSLY EXCLUDED TO THE FULLEST EXTENT PERMITTED BY LAW. “
