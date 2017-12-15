/**
 * Created by durupina on 11/14/16.
 * Human listens to agent socket and performs menu operations requested by the agent
*/

let modelMergeFunctions = require('./model-merge-functions.js')();

module.exports =  function(app) {

    return {

        listen: function () {
            let self = this;


            app.socket.on('loadFile', function (txtFile, callback) {
                try {

                    appUtilities.getActiveSbgnvizInstance().loadSBGNMLText(txtFile);
                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }

            });

            app.socket.on('newFile', function (data, callback) {

                self.newFile(data, data.cyId,  callback);
            });

            app.socket.on('runLayout', function (data, callback) {
                try {
                    appUtilities.setActiveNetwork(data.cyId);
                    $("#perform-layout").trigger('click');
                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });


            app.socket.on('addNode', function (param, callback) {
                try {
                    //does not trigger cy events
                    let newNode = appUtilities.getChiseInstance(param.cyId).elementUtilities.addNode(param.position.x, param.position.y, param.data.class);


                    //notifies other clients

                    app.modelManager.addModelNode(newNode.id(), param.cyId, param, "me");
                    app.modelManager.initModelNode(newNode, param.cyId, "me");

                    if (callback) callback(newNode.id());
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });


            app.socket.on('deleteEles', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.getCyInstance(data.cyId).elements().unselect();


                    //first delete edges
                    data.elementIds.forEach(function (id) {
                        appUtilities.getCyInstance(data.cyId).getElementById(id).select();
                    });


                    if (data.type === "simple")
                        appUtilities.getChiseInstance(data.cyId).deleteElesSimple(appUtilities.getCyInstance(data.cyId).elements(':selected'));
                    else
                        appUtilities.getChiseInstance(data.cyId).deleteNodesSmart(appUtilities.getCyInstance(data.cyId).nodes(':selected'));

                    if(callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });

            app.socket.on('addImage', function (data, callback) {
                try {

                    let status = app.modelManager.addImage(data);
                    let images = app.modelManager.getImages();
                    app.dynamicResize(images);

                    if (callback) callback(status);

                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });


            app.socket.on('addEdge', function (data, callback) {
                try {
                    //does not trigger cy events
                    let newEdge = appUtilities.getChiseInstance(data.cyId).elementUtilities.addEdge(source, target, sbgnclass, id, visibility);

                    //notifies other clients
                    app.modelManager.addModelEdge(newNode.id(), data.cyId, data, "me");
                    // app.modelManager.initModelEdge(newEdge, cyId, "me");

                    if (callback) callback(newEdge.id());
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });


            app.socket.on('align', function (data, callback) {
                try {
                    let nodes = appUtilities.getCyInstance(data.cyId).collection();
                    if (data.nodeIds === '*' || data.nodeIds === 'all')
                        nodes = appUtilities.getCyInstance(data.cyId).nodes();
                    else
                        data.nodeIds.forEach(function (nodeId) {
                            nodes.add(appUtilities.getCyInstance(data.cyId).getElementById(nodeId));
                        });

                    appUtilities.getChiseInstance(data.cyId).align(nodes, data.horizontal, data.vertical, appUtilities.getCyInstance(data.cyId).getElementById(data.alignTo));

                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }

            });
            app.socket.on('updateVisibility', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.setActiveNetwork(data.cyId);
                    appUtilities.getCyInstance(data.cyId).elements().unselect();

                    if (data.val === "showAll")
                        $("#show-all").trigger('click');
                    else {
                        data.elementIds.forEach(function (id) {
                            appUtilities.getCyInstance(data.cyId).getElementById(id).select();
                        });

                        if (data.val == "show")
                            $("#show-selected").trigger('click');
                        else
                            $("#hide-selected").trigger('click');
                    }


                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });

            app.socket.on('searchByLabel', function (data, callback) {
                try {
                    //unselect all others

                    appUtilities.getCyInstance(data.cyId).elements().unselect();

                    appUtilities.getChiseInstance(data.cyId).searchByLabel(data.label);

                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });
            app.socket.on('updateHighlight', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.getCyInstance(data.cyId).elements().unselect();
                    appUtilities.setActiveNetwork(data.cyId);

                    if (data.val === "remove") {
                        $("#remove-highlights").trigger('click');
                    }
                    else {
                        data.elementIds.forEach(function (id) {
                            appUtilities.getCyInstance(data.cyId).getElementById(id).select();
                        });

                        if (data.val === "neighbors")
                            $("#highlight-neighbors-of-selected").trigger('click');
                        else if (data.val === "processes")
                            $("#highlight-processes-of-selected").trigger('click');
                    }

                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });

            app.socket.on('updateExpandCollapse', function (data, callback) {
                try {

                    //unselect all others
                    appUtilities.getCyInstance(data.cyId).elements().unselect();
                    appUtilities.setActiveNetwork(data.cyId);

                    data.elementIds.forEach(function (id) {
                        appUtilities.getCyInstance(data.cyId).getElementById(id).select();
                    });

                    if (data.val === "collapse")
                        $("#collapse-selected").trigger('click');
                    else
                        $("#expand-selected").trigger('click');

                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });


            app.socket.on('addCompound', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.getCyInstance(data.cyId).elements().unselect();

                    data.elementIds.forEach(function (elId) {
                        let el = appUtilities.getCyInstance(data.cyId).getElementById(elId);
                        if(el.isNode())
                            el.select();
                    });

                      appUtilities.getChiseInstance(data.cyId).createCompoundForGivenNodes(appUtilities.getCyInstance(data.cyId).nodes(':selected'), data.val);



                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }

            });

            app.socket.on('clone', function (data, callback) {
                try {
                    appUtilities.getCyInstance(data.cyId).elements().unselect();
                    appUtilities.setActiveNetwork(data.cyId);

                    data.elementIds.forEach(function (nodeId) {
                        appUtilities.getCyInstance(data.cyId).getElementById(nodeId).select();
                    });

                    $("#clone-selected").trigger('click');


                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });

            //Open in another window
            app.socket.on('openPCQueryWindow', function(data, callback){
                let loc = window.location.href;
                if (loc[loc.length - 1] === "#") {
                    loc = loc.slice(0, -1);
                }
                let w = window.open((loc + "_query"), function () {

                });

                // //because window opening takes a while
                setTimeout(function () {

                    let json = appUtilities.getChiseInstance(data.cyId).convertSbgnmlTextToJson(data.graph);
                    w.postMessage(JSON.stringify(json), "*");
                }, 2000);

            });

            app.socket.on("displaySbgn", function(data, callback){

                let jsonObj = appUtilities.getChiseInstance(data.cyId).convertSbgnmlTextToJson(data.sbgn);

                //get another sbgncontainer and display the new SBGN model.
                app.modelManager.newModel("me", true);

                appUtilities.getChiseInstance(data.cyId).updateGraph(jsonObj, function(){
                    app.modelManager.initModel(appUtilities.getCyInstance(data.cyId).nodes(), appUtilities.getCyInstance(data.cyId).edges(), appUtilities, "me");

                    appUtilities.setActiveNetwork(data.cyId);

                    $("#perform-layout").trigger('click');

                    if (callback) callback("success");
                });

            });

            app.socket.on("mergeSbgn", function (data, callback) {

                let newJson = appUtilities.getChiseInstance(data.cyId).convertSbgnmlTextToJson(data.graph);
                if(!data.cyId)
                    data.cyId = appUtilities.getActiveNetworkId();
                // self.mergeJsonWithCurrent(newJson, data.cyId,  app.modelManager, callback);
                modelMergeFunctions.mergeJsonWithCurrent(newJson, data.cyId, app.modelManager, callback);

            });

            app.socket.on("mergeJsonWithCurrent", function (data, callback) {

                if(!data.cyId)
                    data.cyId = appUtilities.getActiveNetworkId();
                modelMergeFunctions.mergeJsonWithCurrent(data.graph, data.cyId, app.modelManager, callback);
                // self.mergeJsonWithCurrent(data.graph, data.cyId, app.modelManager, callback);
            });
        },


        newFile: function(data, cyId,  callback){
            try {
                appUtilities.getCyInstance(cyId).remove(appUtilities.getCyInstance(cyId).elements());
                app.modelManager.newModel(cyId, "me"); //do not delete cytoscape, only the model
                //close all the other tabs
                app.model.set('_page.doc.images', null);

                app.dynamicResize(); //to clean the canvas

                app.model.set('_page.doc.provenance', null);

                if (callback) callback("success");
            }
            catch (e) {
                console.log(e);
                if(callback) callback();

            }
        }
    }
}

