/*
 *	Model initialization
 *  Event handlers of model updates
 *	Author: Funda Durupinar Babur<f.durupinar@gmail.com>
 */
var app = module.exports = require('derby').createApp('cwc', __filename);


app.loadViews(__dirname + '/views');
//app.loadStyles(__dirname + '/styles');
//app.serverUse(module, 'derby-stylus');


var ONE_DAY = 1000 * 60 * 60 * 24;

var ONE_HOUR = 1000 * 60 * 60;

var ONE_MINUTE = 1000 * 60;

var docReady = false;

var useQunit = true;

var menu;

var userCount;
var socket;

var room;
var modelManager;
var oneColor = require('onecolor');
app.on('model', function (model) {


    model.fn('pluckUserIds', function (items, additional) {
        var ids, item, key;


        if (items == null) {
            items = {};
        }
        ids = {};
        if (additional) {
            ids[additional] = true;

        }
        for (key in items) {
            item = items[key];
            //do not include previous messages

            if (item != null ? item.userId : void 0) {
                ids[item.userId] = true;
            }
        }


        return Object.keys(ids);
    });

    model.fn('biggerTime', function (item) {
        var duration = model.get('_page.durationId');
        var startTime;
        if (duration < 0)
            startTime = 0;
        else
            startTime = new Date - duration;

        return item.date > startTime;
    });


});

app.get('/', function (page, model, params) {
    function getId() {
        return model.id();
    }




    function idIsReserved() {
        var ret = model.get('documents.' + docId) != undefined;
        return ret;
    }

    var docId = getId();

    while (idIsReserved()) {
        docId = getId();
    }

    // if( useQunit ){ // use qunit testing doc if we're testing so we don't disrupt real docs
    //     docId = 'qunit';
    // }

    return page.redirect('/' + docId);
});


app.get('/:docId', function (page, model, arg, next) {
    var messagesQuery, room;
    room = arg.docId;

    //   var docPath = model.at('documents.' + arg.docId);

    //model.subscribe('documents', function(err){
    var docPath = 'documents.' + arg.docId;
    model.ref('_page.doc', ('documents.' + arg.docId));

    model.subscribe(docPath, function (err) {
        if (err) return next(err);

        model.createNull(docPath, { // create the empty new doc if it doesn't already exist
            id: arg.docId
        });


        // create a reference to the document
        var cy = model.at((docPath + '.cy'));
        var history = model.at((docPath + '.history'));
        var undoIndex = model.at((docPath + '.undoIndex'));
        var context = model.at((docPath + '.context'));
        var images = model.at((docPath + '.images'));

        var users = model.at((docPath + '.users'));
        var userIds = model.at((docPath + '.userIds'));
        var messages = model.at((docPath + '.messages'));

        cy.subscribe(function () {

            history.subscribe(function () {

                undoIndex.subscribe(function () {
                    context.subscribe(function () {

                        images.subscribe(function () {
                            // //chat related
                            model.set('_page.room', room);
                            //
                            model.set('_page.durations', [{name: 'All', id: -1}, {name: 'One day', id: ONE_DAY}, {
                                name: 'One hour',
                                id: ONE_HOUR
                            }, {name: 'One minute', id: ONE_MINUTE}]);
                            var userId = model.get('_session.userId');
                            // page.render();

                            // messagesQuery = model.query('messages', {
                            //     room: room,
                            //     date: {
                            //         $gt: 0
                            //     },
                            //     targets: {
                            //         $elemMatch: {id: userId}
                            //     }
                            // });
                            //
                            // messagesQuery.subscribe(function (err) {

                            messages.subscribe(function() {
                                if (err) {
                                    return next(err);
                                }

                                var userId = model.get('_session.userId');
                                //model.add('_page.doc.userIds',userId);
                                //var userCnt = model.get('_page.doc.userIds').length();

                                userIds.subscribe(function() {
                                    userIds.push(userId);
                                    users.subscribe(function () {
                                        var userCnt = Object.keys(users).length;

                                        users.set(userId, {name: ('User ' + userCnt), colorCode: getNewColor()});


                                        //console.log(users.get());
                                        //just to initialize


                                        // var usersQuery = model.query('users', '_page.doc.userIds');
                                        // usersQuery.subscribe(function (err) {
                                        //     if (err) {
                                        //         return next(err);
                                        //     }
                                        //
                                        //
                                        //     var user = model.at('users.' + model.get('_session.userId'));
                                        //
                                        //     userCount = model.get('chat.userCount');


                                        //user.subscribe(function (err) {

                                        // model.createNull(user, { // create the empty new doc if it doesn't already exist
                                        //     name: 'User' + (++userCount),
                                        //     colorCode: getNewColor()
                                        // });


                                        //            model.set('chat.userCount', userCount);
                                        //userCount = model.at('chat.userCount');

                                        // return page.render();

                                        // return userCount.fetch(function (err) {
                                        //     if (user.get()) {
                                        //
                                        //         if (user.get('colorCode') == null) {
                                        //             user.set('colorCode', getNewColor());
                                        //         }
                                        //         if (user.get('name') != null)
                                        //             return page.render();
                                        //
                                        //     }
                                        //     if (err) {
                                        //         return next(err);
                                        //     }
                                        //
                                        //
                                        //     return userCount.increment(function (err) {
                                        //         if (err) {
                                        //             return next(err);
                                        //         }
                                        //
                                        //         // //TODO: Users
                                        //         // model.createNull(user, { // create the empty new doc if it doesn't already exist
                                        //         //         name: 'User ' + userCount.get(),
                                        //         //         colorCode: getNewColor()
                                        //         // });
                                        //
                                        //
                                        //         //     console.log(user.set('name', "hello"));
                                        //
                                        //          //user.set('name','User ' + userCount.get() );
                                        //          user.set({
                                        //              name: 'User ' + userCount.get(),
                                        //              colorCode: getNewColor()
                                        //          });

                                        return page.render();
                                        //          });
                                        //   });
                                        //     });
                                    });
                                });

                            });
                        });

                    });
                });


            });
        });

    });
});



function getNewColor(){
    var gR = 1.618033988749895; //golden ratio
    var h = Math.floor((Math.random() * gR * 360));//Math.floor((cInd * gR - Math.floor(cInd * gR))*360);
    var cHsl = [h, 70 + Math.random() * 30, 60 + Math.random() * 10];

  //  return ('hsla('+cHsl[0]  +', '+ cHsl[1] + '%, ' + cHsl[2] +'%, 1)');
    var strHsl = 'hsl('+cHsl[0]  +', '+ cHsl[1] + '%, ' + cHsl[2] +'%)';

  return oneColor(strHsl).hex();


}


function triggerContentChange(divId){
    //TODO: triggering here is not good

    $(('#' + divId)).trigger('contentchanged');

}
function playSound() {
    try {
        document.getElementById('notificationAudio').play();
        if (!document)
            throw err;
    }
    catch (err) {
        return err;
    }


}



app.proto.changeDuration = function () {

    return this.model.filter('messages', 'biggerTime').ref('_page.list');


};

app.proto.create = function (model) {
    model.set('_page.showTime', true);

    var self = this;
    docReady = true;




    socket = io();

    var id = model.get('_session.userId');
    var name = model.get('_page.doc.users.' + id +'.name');
    socket.emit("subscribeHuman", {userName:name,room:  model.get('_page.room'), userId: id}, function(userList){

        var userIds =[];
        userList.forEach(function(user){
            userIds.push(user.userId);
        });

        model.set('_page.doc.userIds', userIds );
    }); //subscribe to current doc as a new room




    //to capture user disconnection, this has to be throuagh sockets-- not model
    socket.on('userList', function(userList){
        var userIds =[];
        userList.forEach(function(user){
            userIds.push(user.userId);
        });

        model.set('_page.doc.userIds', userIds );

    });

    // socket.on('loadFile', function(txtFile){
    //     menu.loadFile(txtFile);
    // });

    socket.on('newFile', function(){
        $('#new-file').trigger("click");
    });

    //better through sockets-- model operation causes complications
    socket.on('runLayout', function(){
        $("#perform-layout").trigger('click');
    });


    socket.on('addNode', function(data, callback){
        // var nodeId = menu.addNode(null, data.x, data.y, data.sbgnclass, data.sbgnlabel, true);
        //
        // if(callback) callback(nodeId);

    });

    // socket.on('agentContextQuestion', function(socketId){
    //     setTimeout(function() {
    //         var answer = confirm("Do you agree with the context?");
    //         socket.emit('contextAnswer', {socketId: socketId, value:answer});
    //         //if (callback) callback(answer);
    //     }, 1000); //wait for the human to read
    //
    // });

    //TODO: make this a function in menu-functions
    socket.on('addCompound', function(data){

        //unselect all others
        cy.nodes().unselect();

        data.selectedNodeIds.forEach(function(nodeId){

            cy.getElementById( nodeId).select();
        });


    });




    modelManager = require('./public/cwc/modelManager.js')(model, model.get('_page.room'), model.get('_session.userId'),name );


    var main = require('./public/main.js'); //to initialize appCy, appMenu and relevant modules

    //initially loaded model is sample 1

    var modelJson = modelManager.getJsonFromModel();


    setTimeout(function(){
        self.loadCyFromModel();

        setTimeout(function() {
            modelManager.initModel(cy.nodes(), cy.edges(), "me");

            require('./public/cwc/editor-listener.js')(modelManager);

        }, 0);

    }, 2000);



    this.atBottom = true;



    return model.on('all', '_page.list', (function (_this) {

        return function () {
            if (!_this.atBottom) {
                return;
            }
            return _this.container.scrollTop = _this.list.offsetHeight;
        };
    })(this));
};

app.proto.loadCyFromModel = function(){
    var modelJson = modelManager.getJsonFromModel();


    if (modelJson) {
        //Updates data fields and sets style fields to default
        chise.updateGraph({
            nodes: modelJson.nodes,
            edges: modelJson.edges
        });

        //Update style fields separately
        cy.nodes().forEach(function(node){
            var modelNode = modelManager.getModelNode(node.id());
            node.css('background-color', modelNode.backgroundColor);
            node.css('border-width', modelNode.borderWidth);
            node.css('opacity', modelNode.opacity);
            node.css('visibility', modelNode.visibility);
            node.css('display', modelNode.display);
        });

        cy.edges().forEach(function(edge){
            var modelEdge = modelManager.getModelEdge(edge.id());
            edge.css('line-color', modelEdge.lineColor);
            edge.css('background-color', modelEdge.backgroundColor);
            edge.css('background-opacity', modelEdge.backgroundOpacity);
            edge.css('border-width', modelEdge.borderWidth);
            edge.css('width', modelEdge.width);
            edge.css('opacity', modelEdge.opacity);

        });

    }
}

function moveNodeAndChildren(positionDiff, node, notCalcTopMostNodes) {
        var oldX = node.position("x");
        var oldY = node.position("y");
        node.position({
            x: oldX + positionDiff.x,
            y: oldY + positionDiff.y
        });
        var children = node.children();
        children.forEach(function(child){
            moveNodeAndChildren(positionDiff, child, true);
        });
}


app.proto.init = function (model) {
    var timeSort;

    var self = this;
    //Cy updated by other clients
    model.on('change', '_page.doc.cy.initTime', function( val, prev, passed){

        if(docReady &&  passed.user == null) {

            self.loadCyFromModel();

        }
    });

    model.on('all', '_page.doc.cy.nodes.*', function(id, op, val, prev, passed){

        if(docReady &&  passed.user == null) {

            var node  = model.get('_page.doc.cy.nodes.' + id);


            if(!node || !node.id){ //node is deleted
                console.log("removal here" + id);
                cy.getElementById(id).remove();



                var modelJson = modelManager.getJsonFromModel();

                console.log(modelJson);


            }
        }


    });

    model.on('all', '_page.doc.cy.edges.*', function(id, op, val, prev, passed){

        if(docReady &&  passed.user == null) {
            var edge  = model.get('_page.doc.cy.edges.' + id); //check

            if(!edge|| !edge.id){ //edge is deleted
                cy.getElementById(id).remove();

            }
        }

    });

    model.on('all', '_page.doc.cy.nodes.*.addedLater', function(id, op, idName, prev, passed){ //this property must be something that is only changed during insertion


        if(docReady && passed.user == null) {
            var pos = model.get('_page.doc.cy.nodes.'+ id + '.position');
            var sbgnclass = model.get('_page.doc.cy.nodes.'+ id + '.class');
           var visibility = model.get('_page.doc.cy.nodes.'+ id + '.visibility');
           var parent = model.get('_page.doc.cy.nodes.'+ id + 'data.parent');

           if(parent == undefined) parent = null;


            var newNode = chise.elementUtilities.addNode(pos.x, pos.y, sbgnclass, id, parent, visibility);



            newNode.move({"parent":parent});
        }

    });

    model.on('all', '_page.doc.cy.edges.*.addedLater', function(id,op, idName, prev, passed){//this property must be something that is only changed during insertion


        if(docReady && passed.user == null ){
            var source = model.get('_page.doc.cy.edges.'+ id + '.source');
            var target = model.get('_page.doc.cy.edges.'+ id + '.target');
            var sbgnclass = model.get('_page.doc.cy.edges.'+ id + '.class');
            var visibility = model.get('_page.doc.cy.nodes.'+ id + '.visibility');


            chise.elementUtilities.addEdge(source, target, id, sbgnclass, visibility);

        }

    });
    model.on('all', '_page.doc.cy.nodes.*.position', function(id, op, pos,prev, passed){

        if(docReady && passed.user == null) {
            var posDiff = {x: (pos.x - cy.getElementById(id).position("x")), y:(pos.y - cy.getElementById(id).position("y"))} ;
            moveNodeAndChildren(posDiff, cy.getElementById(id)); //children need to be updated manually here

        }
    });
    model.on('all', '_page.doc.cy.nodes.*.highlightColor', function(id, op, val,prev, passed){

        if(docReady && passed.user == null) {
            if(val == null){
                cy.getElementById(id).css({
                    "overlay-color": null,
                    "overlay-padding": 10,
                    "overlay-opacity": 0
                });

            }
            else
             cy.getElementById(id).css({
                 "overlay-color": "blue",
                 "overlay-padding": 10,
                 "overlay-opacity": 0.25
             });


        }
    });


    model.on('all', '_page.doc.cy.nodes.*.data', function(id, op, data,prev, passed){

        if(docReady && passed.user == null) {
            //cy.getElementById(id).data(data); //can't call this if cy element does not have a field called "data"
            cy.getElementById(id)._private.data = data;

            //to update parent
            var newParent = data.parent;
            if(newParent == undefined)
                newParent = null;  //must be null explicitly

            cy.getElementById(id).move({"parent":newParent});
            cy.getElementById(id).updateStyle();
        }
    });

    model.on('all', '_page.doc.cy.edges.*.data', function(id, op, data,prev, passed){

        if(docReady && passed.user == null) {
            //cy.getElementById(id).data(data); //can't call this if cy element does not have a field called "data"
            cy.getElementById(id)._private.data = data;

        }
    });



    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.nodes.*.backgroundColor', function(id, op, val,prev, passed){


        if(docReady && passed.user == null) {
            cy.getElementById(id).css("background-color", val);


        }
    });
    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.nodes.*.borderWidth', function(id, op, val,prev, passed){


        if(docReady && passed.user == null) {
            cy.getElementById(id).css("border-width", val);

        }
    });
    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.nodes.*.opacity', function(id, op, val,prev, passed){


        if(docReady && passed.user == null) {
            cy.getElementById(id).css("opacity", val);

        }
    });

    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.edges.*.width', function(id, op, val,prev, passed){


        if(docReady && passed.user == null) {
            cy.getElementById(id).css("width", val);

        }
    });

    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.edges.*.opacity', function(id, op, val,prev, passed){


        if(docReady && passed.user == null) {
            cy.getElementById(id).css("opacity", val);

        }
    });

    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.edges.*.lineColor', function(id, op, val,prev, passed){


        if(docReady && passed.user == null) {
            cy.getElementById(id).css("line-color", val);

        }
    });
    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.edges.*.width', function(id, op, val,prev, passed){

        if(docReady && passed.user == null) {
            cy.getElementById(id).css("width", val);

        }
    });

    model.on('all', '_page.doc.cy.edges.*.backgroundOpacity', function(id, op, val,prev, passed){

        if(docReady && passed.user == null) {
            cy.getElementById(id).css("background-opacity", val);

        }
    });
    model.on('all', '_page.doc.cy.edges.*.backgroundColor', function(id, op, val,prev, passed){

        if(docReady && passed.user == null) {
            cy.getElementById(id).css("background-color", val);

        }
    });
    model.on('all', '_page.doc.cy.edges.*.borderWidth', function(id, op, val,prev, passed){

        if(docReady && passed.user == null) {
            cy.getElementById(id).css("border-width", val);

        }
    });
    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.nodes.*.visibility', function(id, op, val,prev, passed){


        if(docReady && passed.user == null) {
            cy.getElementById(id).css("visibility", val);

        }
    });


    //should handle all css attributes separately as they are so many and cyclic
    model.on('all', '_page.doc.cy.nodes.*.display', function(id, op, val,prev, passed){


        if(docReady && passed.user == null) {
            cy.getElementById(id).css("display", val);

        }
    });

    model.on('all', '_page.doc.cy.nodes.*.expandCollapseStatus', function(id, op, val,prev, passed){



        if(docReady && passed.user == null) {
            var expandCollapse = cy.expandCollapse('get'); //we can't call chise.expand or collapse directly as it causes infinite calls
            console.log(val);
            if(val === "expand"){
                expandCollapse.expand(cy.getElementById(id));
            }
            else
                expandCollapse.collapse(cy.getElementById(id));
        }

    });


    model.on('all', '_page.doc.cy.nodes.*.highlightStatus', function(id, op, highlightStatus, prev, passed){ //this property must be something that is only changed during insertion
        if(docReady && passed.user == null) {
            try{
                var viewUtilities = cy.viewUtilities('get');

                 if(highlightStatus === "highlighted")
                     viewUtilities.highlight(cy.getElementById(id));
                 else
                     viewUtilities.unhighlight(cy.getElementById(id));

            }
            catch(e){
                console.log(e);
            }

        }
    });
    model.on('all', '_page.doc.cy.edges.*.highlightStatus', function(id, op, highlightStatus, prev, passed){ //this property must be something that is only changed during insertion
        if(docReady && passed.user == null) {
            var viewUtilities = cy.viewUtilities('get');
            try{
                if(highlightStatus === "highlighted")
                    viewUtilities.highlight(cy.getElementById(id));
                else
                    viewUtilities.unhighlight(cy.getElementById(id));

            }
            catch(e){
                console.log(e);
            }

        }
    });
    model.on('all', '_page.doc.cy.nodes.*.visibilityStatus', function(id, op, visibilityStatus, prev, passed){ //this property must be something that is only changed during insertion
        if(docReady && passed.user == null) {
            try{
                var viewUtilities = cy.viewUtilities('get');

                if(visibilityStatus === "hide")
                    viewUtilities.hide(cy.getElementById(id));
                else
                    viewUtilities.show(cy.getElementById(id));

            }
            catch(e){
                console.log(e);
            }

        }
    });
    model.on('all', '_page.doc.cy.edges.*.visibilityStatus', function(id, op, visibilityStatus, prev, passed){ //this property must be something that is only changed during insertion
        if(docReady && passed.user == null) {
            var viewUtilities = cy.viewUtilities('get');
            try{
                if(visibilityStatus === "hide")
                    viewUtilities.hide(cy.getElementById(id));
                else
                    viewUtilities.show(cy.getElementById(id));

            }
            catch(e){
                console.log(e);
            }

        }
    });
   //    model.on('all', '_page.doc.images', function() {
//         if (docReady)
//             triggerContentChange('receivedImages');
//     });
//
//     model.on('all', '_page.doc.history', function(){
//         if(docReady){
//             triggerContentChange('command-history-area');
//         }
//     });
//
//
//     model.on('all', '_page.doc.undoIndex', function(){
//     //    menu.refreshGlobalUndoRedoButtonsStatus();
//
//     });
    model.on('insert', '_page.list', function (index) {


        var com = model.get('_page.list');
        var myId = model.get('_session.userId');


        if(docReady){
            triggerContentChange('messages');

        }

        if (com[com.length - 1].userId != myId) {

            playSound();

        }
    });


    timeSort = function (a, b) {

        return (a != null ? a.date : void 0) - (b != null ? b.date : void 0);
    };



    return model.sort('messages', timeSort).ref('_page.list');
};


app.proto.onScroll = function () {
    var bottom, containerHeight, scrollBottom;
    bottom = this.list.offsetHeight;
    containerHeight = this.container.offsetHeight;
    scrollBottom = this.container.scrollTop + containerHeight;

    return this.atBottom = bottom < containerHeight || scrollBottom > bottom - 10;

};


app.proto.changeColorCode = function(){

    var  user = this.model.at('_page.doc.users.' + this.model.get('_session.userId'));

    console.log("here");

    user.set('colorCode', getNewColor());


    console.log(user.get('colorCode'));

};
app.proto.runUnitTests = function(){
    //require("./public/test/testsMenuFunctions.js")();
    require("./public/test/testsModelManager.js")();

    require("./public/test/testOptions.js")(); //to print out results

}

app.proto.add = function (model, filePath) {

    if(model == null)

        model = this.model;
    this.atBottom = true;



        var comment;
        comment = model.del('_page.newComment'); //to clear  the input box
        if (!comment) {
            return;
        }

        var targets  = [];
        var users = model.get('_page.doc.userIds');

        var myId = model.get('_session.userId');
        for(var i = 0; i < users.length; i++){
            var user = users[i];
            if(user == myId ||  document.getElementById(user).checked){
                targets.push({id: user});
            }
        }

        var msgUserId = model.get('_session.userId');
        var msgUserName = model.get('users.' + msgUserId +'.name');

        model.add('messages', {
            room: model.get('_page.room'),
            targets: targets,
            userId: msgUserId,
            userName: msgUserName,
            comment: comment,
            date: -1//val //server assigns the correct time
        });




    //append image  after updating the message list on the page
        //if(filePath!=null) {
        //    var msgs = $("div[class='message']");
        //    //append this to the message with the filepath as a thumbnail
        //    $("div[class='message']").each(function (index, element) {
        //        if ($(element).context.innerHTML.indexOf(filePath) > -1) {
        //            $(element).append("<div class = 'receivedImage' ></div>");
        //        //
        //        }
        //    });
        //

//s        }
};




app.proto.uploadFile = function(evt){

    try{
        var room = this.model.get('_page.room');
        var fileStr = this.model.get("_page.newFile").split('\\');
        var filePath = fileStr[fileStr.length-1];

        var file = evt.target.files[0];

        var reader = new FileReader();
        reader.onload = function(evt){
            modelManager.addImage({ img: evt.target.result,room: room, filePath: filePath});

        };

        reader.readAsDataURL(file);

        //Add file name as a text message
        this.model.set('_page.newComment', "Sent image: "  + filePath );

        this.app.proto.add(this.model, filePath);


    }
    catch(error){ //clicking cancel when the same file is selected causes error
        console.log(error);

    }
};


app.proto.count = function (value) {
    return Object.keys(value || {}).length;
};



app.proto.formatTime = function (message) {
    var hours, minutes, seconds, period, time;
    time = message && message.date;
    if (!time) {
        return;
    }
    time = new Date(time);
    hours = time.getHours();

    minutes = time.getMinutes();

    seconds = time.getSeconds();

    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    if (seconds < 10) {
        seconds = '0' + seconds;
    }
    return hours + ':' + minutes + ':' + seconds;
};

app.proto.formatObj = function(obj){

    return JSON.stringify(obj, null, '\t');
};


