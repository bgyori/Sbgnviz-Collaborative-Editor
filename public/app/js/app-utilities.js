/*
 *
 * Common utilities for sample application. Includes functions and variables.
 * You can directly utilize this object also you can use this object to set a variable in a file and access it in another file.
 */
var jquery = $ = require('jquery');
var chroma = require('chroma-js');
var chise = require('chise');

var appUtilities = {};

// Get the whole scratchpad reserved for newt (on an element or core) or get a single property of it
appUtilities.getScratch = function (cyOrEle, name) {
    if (cyOrEle.scratch('_newt') === undefined) {
        cyOrEle.scratch('_newt', {});
    }

    var scratch = cyOrEle.scratch('_newt');
    var retVal = ( name === undefined ) ? scratch : scratch[name];
    return retVal;
}

// Set a single property on scratchpad of an element or the core
appUtilities.setScratch = function (cyOrEle, name, val) {
    this.getScratch(cyOrEle)[name] = val;
}

// id for the next network to be created, starts by 0
// a unique div selector is to be created using this id
appUtilities.nextNetworkId = 0;

// Configuration flag for whether the operations should be undoable.
// It is to be checked and passed to extensions/libraries where applicable.
appUtilities.undoable = true;

// A stack to order network ids. The top of stack represents the active network while
// the one closest to the top is represents the previous active network.
appUtilities.networkIdsStack = [];

// map of unique network id to related chise.js instance
appUtilities.networkIdToChiseInstance = {};

appUtilities.adjustUIComponents = function (_cy) {

    // if _cy param is not set use the active cy instance
    var cy = _cy || appUtilities.getActiveCy();

    // adjust UI components in inspector map tab

    appUtilities.colorSchemeInspectorView.render();
    appUtilities.mapTabGeneralPanel.render();
    appUtilities.mapTabLabelPanel.render();
    appUtilities.mapTabRearrangementPanel.render();

    // needing an appUndoActions instance here is something unexpected
    // but since appUndoActions.refreshColorSchemeMenu is used below in an unfortunate way we need an instance of it
    // that uses the active cy instance
    var appUndoActionsFactory = require('./app-undo-actions-factory');
    var appUndoActions = appUndoActionsFactory(appUtilities.getActiveCy());

    // get current general properties for cy
    var generalProperties = appUtilities.getScratch(cy, 'currentGeneralProperties');

    // refresh color schema menu
    appUndoActions.refreshColorSchemeMenu({value: generalProperties.mapColorScheme, self: appUtilities.colorSchemeInspectorView});

    // set the file content by the current file name for cy
    var fileName = appUtilities.getScratch(cy, 'currentFileName');
    appUtilities.setFileContent(fileName);

    // reset the status of undo redo buttons
    appUtilities.refreshUndoRedoButtonsStatus(cy);

    // adjust UI components related to mode properties

    // access the mode properties of cy
    var modeProperties = appUtilities.getScratch(cy, 'modeProperties');

    // html values to select
    var nodeVal = modeProperties.selectedNodeType.replace(/ /gi, '-'); // Html values includes '-' instead of ' '
    var edgeVal = modeProperties.selectedEdgeType.replace(/ /gi, '-'); // Html values includes '-' instead of ' '

    var mode = modeProperties.mode;
    var sustainMode = modeProperties.sustainMode;
    var nodeLang = modeProperties.selectedNodeLanguage;
    var edgeLang = modeProperties.selectedEdgeLanguage;

    $('.node-palette img').removeClass('selected-mode');
    $('.edge-palette img').removeClass('selected-mode');

    // Get images for node/edge palettes
    var nodeImg = $('.node-palette img[value="'+nodeVal+'"][language="' + nodeLang + '"]');
    var edgeImg = $('.edge-palette img[value="'+edgeVal+'"][language="' + edgeLang + '"]');

    // also set the icons in toolbar accordingly
    $('#add-node-mode-icon').attr('src', nodeImg.attr('src'));
    $('#add-node-mode-icon').attr('title', "Create a new " + nodeImg.attr('title'));
    $('#add-edge-mode-icon').attr('src', edgeImg.attr('src'));
    $('#add-edge-mode-icon').attr('title', "Create a new " + edgeImg.attr('title'));

    // unactivate all UI components
    $('#select-mode-icon').parent().removeClass('selected-mode');
    $('#add-edge-mode-icon').parent().removeClass('selected-mode');
    $('#add-node-mode-icon').parent().removeClass('selected-mode');
    $('#add-edge-mode-icon').parent().removeClass('selected-mode-sustainable');
    $('#add-node-mode-icon').parent().removeClass('selected-mode-sustainable');
    $('#marquee-zoom-mode-icon').parent().removeClass('selected-mode');
    $('.node-palette img').addClass('inactive-palette-element');
    $('.edge-palette img').addClass('inactive-palette-element');
    $('.selected-mode-sustainable').removeClass('selected-mode-sustainable');

    // Node/edge palettes should be initialized according to default nodeVal and edgeVal
    nodeImg.addClass('selected-mode');
    edgeImg.addClass('selected-mode');

    var modeHandler = require('./app-mode-handler');

    // adjust UI components according to the params
    if ( mode === 'selection-mode' ) {

        $('#select-mode-icon').parent().addClass('selected-mode');

        modeHandler.autoEnableMenuItems(true);
    }
    else if ( mode === 'add-node-mode' ) {

        $('#add-node-mode-icon').parent().addClass('selected-mode');
        $('.node-palette img').removeClass('inactive-palette-element');

        modeHandler.autoEnableMenuItems(false);

        if ( sustainMode ) {
            $('#add-node-mode-icon').parent().addClass('selected-mode-sustainable');
            $('.node-palette .selected-mode').addClass('selected-mode-sustainable');
        }

    }
    else if ( mode === 'add-edge-mode' ) {

        $('#add-edge-mode-icon').parent().addClass('selected-mode');
        $('.edge-palette img').removeClass('inactive-palette-element');

        modeHandler.autoEnableMenuItems(false);

        if ( sustainMode ) {
            $('#add-edge-mode-icon').parent().addClass('selected-mode-sustainable');
            $('.edge-palette .selected-mode').addClass('selected-mode-sustainable');
        }

    }
    else if( mode === 'marquee-zoom-mode'){

        $('#marquee-zoom-mode-icon').parent().addClass('selected-mode');

    }

    // adjust status of grid guide related icons in toolbar

    // get the current status of related variables for cy
    var toggleEnableGuidelineAndSnap = appUtilities.getScratch(cy, 'toggleEnableGuidelineAndSnap');
    var toggleShowGridEnableSnap = appUtilities.getScratch(cy, 'toggleShowGridEnableSnap');

    // adjust toggle-guidelines-snapping-icon icons accordingly
    if (toggleEnableGuidelineAndSnap){
        $('#toggle-guidelines-snapping-icon').addClass('toggle-mode-sustainable');
    }
    else{
        $('#toggle-guidelines-snapping-icon').removeClass('toggle-mode-sustainable');
    }

    // adjust oggle-grid-snapping-icon accordingly
    if (toggleShowGridEnableSnap){
        $('#toggle-grid-snapping-icon').addClass('toggle-mode-sustainable');
    }
    else{
        $('#toggle-grid-snapping-icon').removeClass('toggle-mode-sustainable');
    }
};

// get id of the div panel for the given network id
appUtilities.getNetworkPanelId = function (networkId) {
    return 'sbgn-network-container-' + networkId;
};

// get id of the tab for the the given network id
appUtilities.getNetworkTabId = function (networkId) {
    return 'sbgn-network-tab-' + networkId;
};

// get network id by given network key (would be tab or panel id or selector or even the network id itself)
// that is basically the remaining part of the string after the last occurance of '-'
appUtilities.getNetworkId = function (networkKey) {

    // if the networkKey is a number it must already be the network id, so no need to process
    if (typeof networkKey === 'number') {
        return networkKey;
    }

    // get the last index of '-'
    var index =  networkKey.lastIndexOf("-");

    // get the remaining part of string after the last occurance of '-'
    var rem = networkKey.substring(index+1);

    // id is the integer representation of the remaining string
    var id = parseInt(rem);

    // return the obtained id
    return id;
};

// get selector of the div panel for the given network id
// it is basically '#' + panelId
appUtilities.getNetworkPanelSelector = function (networkId) {
    return '#' + this.getNetworkPanelId(networkId);
};

// selector of the tab for the the given network id
// it is basically '#' + tabId
appUtilities.getNetworkTabSelector = function (networkId) {
    return '#' + this.getNetworkTabId(networkId);
};

// get the default map name for a network with the given id
// basically like "Pathway #X"
appUtilities.getDefaultMapName = function (networkId) {

    // return 'Pathway #' + networkId;

    return '#' +(networkId + 1); //FUNDA
};

// update the string that represents the tab for the given networkKey
appUtilities.updateNetworkTabDesc = function (networkKey) {

    // get network id for the given network key (would be networkId, networkTabId, networkPanelId)
    var networkId = this.getNetworkId(networkKey);

    // get the id of related network tab
    var tabId = this.getNetworkTabId(networkId);

    // get the related chise instace
    var chiseInstance = this.getChiseInstance(networkId);

    // get the related cy instance
    var cy = chiseInstance.getCy();

    // get the map name from scratch pad of cy to use as the new tab description
    var mapName = this.getScratch(cy).currentGeneralProperties.mapName;

    // if mapName is empty set it to "Pathway" #219
    if (!mapName)
        mapName = "Pathway";

    // update the content of 'a' element that is contained by the related tab
    $('#' + tabId + ' a').text(mapName);
};

// map given chise instance to the given network id
// if key param is a cy instance or tab/panel id/selector use the actual network id
appUtilities.putToChiseInstances = function (key, chiseInstance) {

    // if key is a cy instance go for its container id
    var networkId = typeof key === 'object' ? key.container().id : key;

    // if the network id parameter is the network tab/panel id/selector get the actual network id
    networkId = this.getNetworkId(networkId);

    // Throw error if there is already an instance mapped for the networkId
    if ( this.networkIdToChiseInstance[networkId] ) {
        throw 'A chise instance is already mapped for network id ' + networkId;
    }

    // perfrom the actual mapping
    this.networkIdToChiseInstance[networkId] = chiseInstance;
};

// remove the chise instance mapped to the given key
// if key param is a cy instance or tab/panel id/selector use the actual network id
appUtilities.removeFromChiseInstances = function (key) {

    // if key is a cy instance go for its container id
    var networkId = typeof key === 'object' ? key.container().id : key;

    // if the network id parameter is the network tab/panel id/selector get the actual network id
    networkId = this.getNetworkId(networkId);

    // Throw error if there is no instance mapped for the networkId
    if ( !this.networkIdToChiseInstance[networkId] ) {
        throw 'No chise instance is mapped for network id ' + networkId;
    }

    // perform the actual removal
    delete this.networkIdToChiseInstance[networkId];
};

// get the chise instance mapped to the given key
// if key param is a cy instance or tab/panel id/selector use the actual network id
appUtilities.getChiseInstance = function (key) {

    // if key is a cy instance go for its container id
    var networkId = typeof key === 'object' ? key.container().id : key;

    // if the network id parameter is the network tab/panel id/selector get the actual network id
    networkId = this.getNetworkId(networkId);

    // return the chise instance mapped for the network id
    return this.networkIdToChiseInstance[networkId];
};

// If there is just one network then network tabs should not be rendered.
// This function is to adjust that.
appUtilities.adjustVisibilityOfNetworkTabs = function () {
    /* //FUNDA don't use in cwc
      var tabsContainer = $('#network-tabs-list-container');

      // if there is just one tab hide tabs container else show it
      if ( this.networkIdsStack.length === 1 ) {
        tabsContainer.hide();
      }
      else {
        tabsContainer.show();
      }
    */
};


//FUNDA
appUtilities.getCyInstance = function(key){
    let chiseInst = this.getChiseInstance(key);

    return chiseInst.getCy();

}


//FUNDA changed all of it
// creates a new network and returns the new chise.js instance that is created for this network
appUtilities.createNewNetwork = function (networkIdParam) {
    let networkId = appUtilities.nextNetworkId;
    if(networkIdParam)
        networkId = networkIdParam;

    // id of the div panel associated with the new network
    var networkPanelId = appUtilities.getNetworkPanelId(networkId);

    // id of the tab for the new network
    var networkTabId = appUtilities.getNetworkTabId(networkId);

    // use the default map name for the given next network id
    var mapName = appUtilities.getDefaultMapName(networkId);

    // create physical html components for the new network
    // use map name as the tab description
    appUtilities.createPhysicalNetworkComponents(networkPanelId, networkTabId, mapName);

    // generate network panel selector from the network panel id
    var networkPanelSelector = appUtilities.getNetworkPanelSelector(networkId);

    // initialize current properties for the new instance by copying the default properties
    var currentLayoutProperties = jquery.extend(true, {}, appUtilities.defaultLayoutProperties);
    var currentGridProperties = jquery.extend(true, {}, appUtilities.defaultGridProperties);
    var currentGeneralProperties = jquery.extend(true, {}, appUtilities.defaultGeneralProperties);

    // update the map name with the default map name specific for network id
    currentGeneralProperties.mapName = mapName;

    // Create a new chise.js instance
    var newInst = chise({
        networkContainerSelector: networkPanelSelector,
        // whether to fit label to nodes
        fitLabelsToNodes: function () {
            var currentGeneralProperties = appUtilities.getScratch(newInst.getCy(), 'currentGeneralProperties');
            return currentGeneralProperties.fitLabelsToNodes;
        },
        // whether to fit label to nodes
        fitLabelsToInfoboxes: function () {
            var currentGeneralProperties = appUtilities.getScratch(newInst.getCy(), 'currentGeneralProperties');
            return currentGeneralProperties.fitLabelsToInfoboxes;
        },
        // dynamic label size it may be 'small', 'regular', 'large'
        dynamicLabelSize: function () {
            var currentGeneralProperties = appUtilities.getScratch(newInst.getCy(), 'currentGeneralProperties');
            return currentGeneralProperties.dynamicLabelSize;
        },
        // Whether to infer nesting on load
        inferNestingOnLoad: function () {
            var currentGeneralProperties = appUtilities.getScratch(newInst.getCy(), 'currentGeneralProperties');
            return currentGeneralProperties.inferNestingOnLoad;
        },
        // percentage used to calculate compound paddings
        compoundPadding: function () {
            var currentGeneralProperties = appUtilities.getScratch(newInst.getCy(), 'currentGeneralProperties');
            return currentGeneralProperties.compoundPadding;
        },
        // arrow size changed by a slider on a scale from 0.5-2
        arrowScale: function () {
            var currentGeneralProperties = appUtilities.getScratch(newInst.getCy(), 'currentGeneralProperties');
            return currentGeneralProperties.arrowScale;
        },
        extraCompartmentPadding: currentGeneralProperties.extraCompartmentPadding,
        extraComplexPadding: currentGeneralProperties.extraComplexPadding,
        showComplexName: currentGeneralProperties.showComplexName,
        // Whether to adjust node label font size automatically.
        // If this option return false do not adjust label sizes according to node height uses node.data('labelsize')
        // instead of doing it.
        adjustNodeLabelFontSizeAutomatically: function() {
            var currentGeneralProperties = appUtilities.getScratch(newInst.getCy(), 'currentGeneralProperties');
            return currentGeneralProperties.adjustNodeLabelFontSizeAutomatically;
        },
        // whether to improve flow (swap nodes)
        improveFlow: function () {
            var currentGeneralProperties = appUtilities.getScratch(newInst.getCy(), 'currentGeneralProperties');
            return currentGeneralProperties.improveFlow;
        },
        undoable: appUtilities.undoable,
        undoableDrag: function() {
            return appUtilities.ctrlKeyDown !== true;
        }
    });

    //set border-width of selected nodes to a fixed value
    newInst.getCy().style()
        .selector('node:selected')
        .css({
            'border-width': function(ele){
                return Math.max(ele.data("border-width"), 3);
            }
        });

    // set scracth pad of the related cy instance with these properties
    appUtilities.setScratch(newInst.getCy(), 'currentLayoutProperties', currentLayoutProperties);
    appUtilities.setScratch(newInst.getCy(), 'currentGridProperties', currentGridProperties);
    appUtilities.setScratch(newInst.getCy(), 'currentGeneralProperties', currentGeneralProperties);

    // init the current file name for the map
    appUtilities.setScratch(newInst.getCy(), 'currentFileName', 'new_file.sbgnml');

    // register cy extensions, bind cy events etc.
    var appCy = require('./app-cy');
    appCy(newInst);

    var modeHandler = require('./app-mode-handler');
    modeHandler.initModeProperties(newInst.getCy());

    // maintain networkIdToChiseInstance map
    appUtilities.putToChiseInstances(networkId, newInst);

    // push network id to the top of network ids stack
    this.networkIdsStack.push(networkId);

    // if this is the first network to be created set it as active network here
    // otherwise it will be activated (by listening html events) when the new tab is choosen
    if (networkId === 0) {
        appUtilities.setActiveNetwork(networkId);
    }

    // physically open the new tab
    appUtilities.chooseNetworkTab(networkId);

    // activate palette tab
    if (!$('#inspector-palette-tab').hasClass('active')) {
        $('#inspector-palette-tab a').tab('show');
        $('#inspector-style-tab a').blur();
    }

    // increment new network id
    appUtilities.nextNetworkId = networkId + 1;

    // adjust the visibility of network tabs
    appUtilities.adjustVisibilityOfNetworkTabs();

    //funda
    newInst.cyId = networkId;
    //FUNDA
    $(document).trigger('createNewNetwork', [newInst.getCy(), networkId]);


    // return the new instance
    return newInst;
};
//FUNDA
// CWC change
// remove the networks other than the one having the given networkId
// if networkId is not given then use the active networkId by default
appUtilities.closeOtherNetworks = function (networkId) {

    var networkIdsStack = this.networkIdsStack;

    // if there is already at most one network then we have nothing to do here
    if ( networkIdsStack.length <= 1 ) {
        return;
    }

    // the id of active network before the operation
    var activeNetworkId = this.getActiveNetworkId();

    // if networkId is not defined use the active one by default
    if ( networkId === undefined ) {
        networkId = activeNetworkId;
    }

    // check if we are already using the active network
    var wasActiveNetwork = ( networkId === activeNetworkId);

    for ( var i = 0; i <  networkIdsStack.length; i++) {

        // get the current network id to close
        var currentNetworkId = networkIdsStack[i];

        // pass the parametrized networkId
        if (currentNetworkId === networkId) {
            continue;
        }

        // remove the chise instance mapped to the network id from the chise instances map
        this.removeFromChiseInstances(currentNetworkId);

        // remove physical html components for networkId
        this.removePhysicalNetworkComponents(currentNetworkId);
    }

    // the remaining network is the new active network if it was not so before the operation
    // then we need to choose it as the new active network here
    if ( !wasActiveNetwork ) {
        // choose the network tab for the new active network
        this.chooseNetworkTab(networkId);
    }

    // adjust the visibility of network tabs
    this.adjustVisibilityOfNetworkTabs();

    // update the network ids stack accordingly
    this.networkIdsStack = [ networkId ];
};

// close the active network
appUtilities.closeActiveNetwork = function () {

    // active network id is the one that is at the top of the stack
    // pop and get it
    var activeNetworkId = this.networkIdsStack.pop();

    // remove the chise instance mapped to the actual network id from the chise instances map
    this.removeFromChiseInstances(activeNetworkId);

    // remove physical html components for networkId
    this.removePhysicalNetworkComponents(activeNetworkId);

    // If there is no other network after closing the active one create a new network
    // otherwise just select the tab for the new active network
    if ( this.networkIdsStack.length === 0 ) {

        // create a new network
        this.createNewNetwork();
    }
    else {

        // get the new active network id from the top of the stack
        var newActiveNetworkId = this.networkIdsStack[this.networkIdsStack.length - 1];

        // choose the network tab for the new active network
        this.chooseNetworkTab(newActiveNetworkId);
    }

    // adjust the visibility of network tabs
    this.adjustVisibilityOfNetworkTabs();

    //FUNDA
    $(document).trigger('closeActiveNetwork', activeNetworkId);


};

// removes physical html components for the network that is represented by given networkKey
appUtilities.removePhysicalNetworkComponents = function (networkKey) {

    // use the actual network id (network key may not be equal to it)
    var networkId = appUtilities.getNetworkId(networkKey);

    // get the selector of network panel
    var panelSelector = appUtilities.getNetworkPanelSelector(networkId);

    // get the selector of tab
    var tabSelector = appUtilities.getNetworkTabSelector(networkId);

    // remove the html components corresponding to the selectors
    $(panelSelector).remove();
    $(tabSelector).remove();
};

appUtilities.dropHandler = function (ev) {

    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();

    if (ev.originalEvent.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (var i = 0; i < ev.originalEvent.dataTransfer.items.length; i++) {
            // If dropped items aren't files, reject them
            if (ev.originalEvent.dataTransfer.items[i].kind === 'file') {
                var file = ev.originalEvent.dataTransfer.items[i].getAsFile();
                $("#file-input").trigger("change", [file]);
            }
        }
    } else {
        // Use DataTransfer interface to access the file(s)
        for (var i = 0; i < ev.originalEvent.dataTransfer.files.length; i++) {
            $("#file-input").trigger("change", [file]);
        }
    }

    // Pass event to removeDragData for cleanup
    removeDragData(ev);
};
appUtilities.dragOverHandler = function (ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
};

function removeDragData(ev) {

    if (ev.originalEvent.dataTransfer.items) {
        // Use DataTransferItemList interface to remove the drag data
        ev.originalEvent.dataTransfer.items.clear();
    } else {
        // Use DataTransfer interface to remove the drag data
        ev.originalEvent.dataTransfer.clearData();
    }
}

appUtilities.createPhysicalNetworkComponents = function (panelId, tabId, tabDesc) {

    // the component that includes the tab panels
    var panelsParent = $('#network-panels-container');

    var newPanelStr = '<div id="' + panelId + '" class="tab-pane fade network-panel"></div>';

    // create new panel inside the panels parent
    panelsParent.append(newPanelStr);

    $("#" + panelId).on("drop", function(event){
        appUtilities.dropHandler(event);
        $("#network-panels-container").removeClass("drag-and-drop-file");
    });
    $("#" + panelId).on("dragover", function(event){
        appUtilities.dragOverHandler(event);
        $("#network-panels-container").addClass("drag-and-drop-file");
    });
    $("#" + panelId).on("dragleave", function(event){
        $("#network-panels-container").removeClass("drag-and-drop-file");
    });

    // the container that lists the network tabs
    var tabsList = $('#network-tabs-list');

    var newTabStr = '<li id="' + tabId + '" class="chise-tab chise-network-tab"><a data-toggle="tab" href="#' + panelId + '">' + tabDesc + '</a></li>';

    // create new tab inside the list of network tabs
    tabsList.append(newTabStr);
};

// basically get the active chise instance
appUtilities.getActiveChiseInstance = function () {

    // get the networkId of the active network that is at the top of networkIdsStack
    var activeNetworkId = this.networkIdsStack[this.networkIdsStack.length - 1];

    // return the chise instance mapped for active network id that is the active networks itself
    return this.getChiseInstance(activeNetworkId);
};

// sets the active network through the network key to be activated
appUtilities.setActiveNetwork = function (networkKey) {

    // get chise instance for network key
    var chiseInstance = this.getChiseInstance(networkKey);

    // use the actual network id (network key would not be the actual network id)
    var networkId = this.getNetworkId(networkKey);

    // get old index of the network
    var oldIndex = this.networkIdsStack.indexOf(networkId);

    // if there is no existing network with this id throw an error
    if ( oldIndex === -1 ) {
        throw 'Network with id ' + networkId + ' cannot be found';
    }

    // remove the network from the old index
    this.networkIdsStack.splice(oldIndex, 1);

    // add the new network to the top of the stack
    this.networkIdsStack.push(networkId);

    // adjust UI components for †he activated network
    this.adjustUIComponents();

};

// chooses a network tab programatically
appUtilities.chooseNetworkTab = function (networkKey) {
    // in case of network key is not the network id
    var networkId = this.getNetworkId(networkKey);

    // get id of physical html tab for the ntework id
    var networkTabId = this.getNetworkTabId(networkId);

    // if network tab is not activated activate it
    if (!$('#' + networkTabId).hasClass('active')) {
        $('#' + networkTabId + ' a').tab('show');
    }
};

//FUNDA
appUtilities.getActiveNetworkId = function(){
    if(this.networkIdsStack.length  <= 0 )
        return 0;
    return this.networkIdsStack[this.networkIdsStack.length - 1];
};


// returns the sbgnviz.js instance associated with the currently active netwrok
appUtilities.getActiveSbgnvizInstance = function () {

    var chiseInstance = this.getActiveChiseInstance();

    return chiseInstance ? chiseInstance.getSbgnvizInstance() : false;
};

// returns the cy instance associated with the currently active network
appUtilities.getActiveCy = function () {

    var chiseInstance = this.getActiveChiseInstance();

    return chiseInstance ? chiseInstance.getCy() : false;
};

// returns active network panel
appUtilities.getActiveNetworkPanel = function () {

    var activeCy = this.getActiveCy();

    return activeCy ? activeCy.container() : false;
};

appUtilities.defaultLayoutProperties = {
    name: 'cose-bilkent',
    nodeRepulsion: 2000,
    idealEdgeLength: 30,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    tile: true,
    animationEasing: 'cubic-bezier(0.17,0.72,0.41,0.98)',
    // animate: 'end',
    animate: false, //funda
    // animationDuration: 2000,
    animationDuration: 500, //funda
    randomize: false,
    tilingPaddingVertical: 20,
    tilingPaddingHorizontal: 20,
    gravityRangeCompound: 1.5,
    gravityCompound: 1.0,
    gravityRange: 3.8,
    initialEnergyOnIncremental: 0.3,
    improveFlow: true
};

appUtilities.defaultGridProperties = {
    showGrid: false,
    snapToGridOnRelease: false,
    snapToGridDuringDrag: false,
    snapToAlignmentLocationOnRelease: false,
    snapToAlignmentLocationDuringDrag: false,
    gridSize: 20,
    gridColor: "#c8c8c8",
    autoResizeNodes: false,
    showGeometricGuidelines: false,
    showInitPosAlignment: false,
    showDistributionGuidelines: false,
    lineWidth: 0.75,
    guidelineTolerance: 3.0,
    guidelineColor: "#0B9BCD",
    horizontalGuidelineColor: "#0B9BCD",
    verticalGuidelineColor: "#0B9BCD",
    initPosAlignmentColor: "#0000ff",
    geometricAlignmentRange: 300,
    distributionAlignmentRange: 200,
    minDistributionAlignmentRange: 15,
    initPosAlignmentLine: [0, 0],
    lineDash: [3, 5],
    horizontalDistLine: [0, 0],
    verticalDistLine: [0, 0],
};

appUtilities.defaultGeneralProperties = {
    compoundPadding: 10,
    extraCompartmentPadding: 14,
    extraComplexPadding: 10,
    arrowScale: 1.25,
    showComplexName: true,
    dynamicLabelSize: 'regular',
    inferNestingOnLoad: false,
    fitLabelsToNodes: false,
    fitLabelsToInfoboxes: false,
    recalculateLayoutOnComplexityManagement: true,
    rearrangeOnComplexityManagement: true,
    animateOnDrawingChanges: true,
    adjustNodeLabelFontSizeAutomatically: false,
    enablePorts: false, //funda
    allowCompoundNodeResize: false,
    mapColorScheme: 'black_white',
    defaultInfoboxHeight: 12,
    defaultInfoboxWidth: 8,
    mapType: function() {return appUtilities.getActiveChiseInstance().getMapType() || "Unknown"},
    mapName: "",
    mapDescription: ""
};

appUtilities.setFileContent = function (fileName) {
    var span = document.getElementById('file-name');
    var displayedSpan = document.getElementById('displayed-file-name');
    while (span.firstChild) {
        span.removeChild(span.firstChild);
    }
    while (displayedSpan.firstChild) {
        displayedSpan.removeChild(displayedSpan.firstChild);
    }
    span.appendChild(document.createTextNode(fileName));
    if (fileName.length <= 40)
        displayedSpan.appendChild(document.createTextNode(fileName));
    else displayedSpan.appendChild(document.createTextNode(fileName.substring(0, 34) + "...xml"));

    displayedSpan.style.display = 'block';
    span.style.display = 'none';
};

appUtilities.triggerIncrementalLayout = function (_cy) {

    // use parametrized cy if exists. Otherwise use the recently active cy
    var cy = _cy || this.getActiveCy();

    // access the current general properties of cy
    var currentGeneralProperties = this.getScratch(cy, 'currentGeneralProperties');

    // access the current layout properties of cy
    var currentLayoutProperties = this.getScratch(cy, 'currentLayoutProperties');

    // If 'animate-on-drawing-changes' is false then animate option must be 'end' instead of false
    // If it is 'during' use it as is. Set 'randomize' and 'fit' options to false
    var preferences = {
        randomize: false,
        animate: currentGeneralProperties.animateOnDrawingChanges ? 'end' : false,
        fit: false
    };

    if (currentLayoutProperties.animate === 'during') {
        delete preferences.animate;
    }

    // access chise instance related to cy
    var chiseInstance = appUtilities.getChiseInstance(cy);

    // layout must not be undoable
    this.layoutPropertiesView.applyLayout(preferences, true, chiseInstance);
};

appUtilities.getExpandCollapseOptions = function (_cy) {

    var self = this;

    return {
        fisheye: function () {

            // use parametrized cy if exists. Otherwise use the recently active cy
            var cy = _cy || self.getActiveCy();

            return self.getScratch(cy, 'currentGeneralProperties').rearrangeOnComplexityManagement;
        },
        animate: function () {

            // use parametrized cy if exists. Otherwise use the recently active cy
            var cy = _cy || self.getActiveCy();

            return self.getScratch(cy, 'currentGeneralProperties').animateOnDrawingChanges;
        },
        layoutBy: function () {

            // use parametrized cy if exists. Otherwise use the recently active cy
            var cy = _cy || self.getActiveCy();

            if ( !self.getScratch(cy, 'currentGeneralProperties').recalculateLayoutOnComplexityManagement ) {
                cy.trigger('fit-units-after-expandcollapse');
                return;
            }
            self.triggerIncrementalLayout(cy);
            cy.trigger('fit-units-after-expandcollapse');
        },
        expandCollapseCueSize: 12,
        expandCollapseCuePosition: function (node) {

            // use parametrized cy if exists. Otherwise use the recently active cy
            var cy = _cy || self.getActiveCy();

            var offset = 1, rectSize = 12; // this is the expandCollapseCueSize;
            var size = cy.zoom() < 1 ? rectSize / (2*cy.zoom()) : rectSize / 2;
            var x = node.position('x') - node.width() / 2 - parseFloat(node.css('padding-left'))
                + parseFloat(node.css('border-width')) + size + offset;
            if (node.data("class") == "compartment"){
                var y  = node.position('y') - node.outerHeight() / 2  + Math.min(15, node.outerHeight()*0.05)
                    + parseFloat(node.css('border-width'))+ size;
            } else {
                var y = node.position('y') - node.height() / 2 - parseFloat(node.css('padding-top'))
                    + parseFloat(node.css('border-width')) + size + offset;
            };

            return {'x': x, 'y': y};
        },
    };
};

appUtilities.dynamicResize = function () {

    // get window inner width and inner height that includes scrollbars when they are rendered
    // using $(window).width() would be problematic when scrolls are visible
    // please see: https://stackoverflow.com/questions/19582862/get-browser-window-width-including-scrollbar
    // and https://developer.mozilla.org/en-US/docs/Web/API/Window/innerWidth
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;

    var canvasWidth = 1000;
    var canvasHeight = 680;

    if (windowWidth > canvasWidth)
    {
        //This is the margin on left and right of the main content when the page is
        //displayed
        var mainContentMargin = 10;
        $("#network-panels-container").width(windowWidth  * 0.8 - mainContentMargin);
        $("#sbgn-inspector").width(windowWidth  * 0.2 - mainContentMargin);
        var w = $("#sbgn-inspector-and-canvas").width();
        $(".nav-menu").width(w);
        $(".navbar").width(w);
//    $("#sbgn-info-content").width(windowWidth * 0.85);
        $("#sbgn-toolbar").width(w);
        $("#network-tabs-list-container").width(w);
    }

    if (windowHeight > canvasHeight)
    {
        $("#network-panels-container").height(windowHeight * 0.85);
        $("#sbgn-inspector").height(windowHeight * 0.85);
    }

    // trigger an event to notify that newt components are dynamically resized
    $(document).trigger('newtAfterDynamicResize');
};
/*
appUtilities.nodeQtipFunction = function (node) {
  if (node.renderedStyle("label") == node.data("label") && node.data("statesandinfos").length == 0 && node.data("class") != "complex") {
    return;
  }

  var qtipContent = chise.getQtipContent(node);

  if (!qtipContent) {
    return;
  }

  node.qtip({
    content: function () {
      return qtipContent;
    },
    show: {
      ready: true
    },
    position: {
      my: 'top center',
      at: 'bottom center',
      adjust: {
        cyViewport: true
      }
    },
    style: {
      classes: 'qtip-bootstrap',
      tip: {
        width: 16,
        height: 8
      }
    }
  });
};
*/
appUtilities.refreshUndoRedoButtonsStatus = function (_cy) {

    // use _cy param if it is set else use the recently active cy instance
    var cy = _cy || appUtilities.getActiveCy();

    // get undo redo extension instance for cy
    var ur = cy.undoRedo();

    // refresh status of undo button accordingly
    if (ur.isUndoStackEmpty()) {
        $("#undo-last-action").parent("li").addClass("disabled");
    }
    else {
        $("#undo-last-action").parent("li").removeClass("disabled");
    }

    // refresh status of redo button accordingly
    if (ur.isRedoStackEmpty()) {
        $("#redo-last-action").parent("li").addClass("disabled");
    }
    else {
        $("#redo-last-action").parent("li").removeClass("disabled");
    }
};

appUtilities.resetUndoRedoButtons = function () {
    $("#undo-last-action").parent("li").addClass("disabled");
    $("#redo-last-action").parent("li").addClass("disabled");
};

// Enable drag and drop mode
appUtilities.enableDragAndDropMode = function (_cy) {

    // use _cy param if it is set else use the recently active cy instance
    var cy = _cy || appUtilities.getActiveCy();

    appUtilities.setScratch(cy, 'dragAndDropModeEnabled', true);

    $(cy.container()).find('canvas').addClass("target-cursor");

    cy.autolock(true);
    cy.autounselectify(true);
};

// Disable drag and drop mode
appUtilities.disableDragAndDropMode = function (_cy) {

    // use _cy param if it is set else use the recently active cy instance
    var cy = _cy || appUtilities.getActiveCy();

    appUtilities.setScratch(cy, 'dragAndDropModeEnabled', null);
    appUtilities.setScratch(cy, 'nodesToDragAndDrop', null);

    $(cy.container()).find('canvas').removeClass("target-cursor");

    cy.autolock(false);
    cy.autounselectify(false);
};

// Show neighbors of given eles and perform incremental layout afterward if Rearrange option is checked
appUtilities.showHiddenNeighbors = function (eles, _chiseInstance) {

    // check _chiseInstance param if it is set use it else use recently active chise instance
    var chiseInstance = _chiseInstance || appUtilities.getActiveChiseInstance();

    // get the associated cy instance
    var cy = chiseInstance.getCy();

    // get current general properties for assocated cy instance
    var currentGeneralProperties = appUtilities.getScratch(cy, 'currentGeneralProperties');

    var extendedList = chiseInstance.elementUtilities.extendNodeList(eles);
    if (currentGeneralProperties.recalculateLayoutOnComplexityManagement )
    {
        //Put them near node, show and perform incremental layout
        chiseInstance.showAndPerformLayout(eles, extendedList, this.triggerIncrementalLayout.bind(this, cy));
    }
    else
    {
        //Just show them
        chiseInstance.showEles(extendedList);
    }
};

// Show neighbors of given eles and perform incremental layout afterward if Rearrange option is checked
appUtilities.showAll = function (_chiseInstance) {

    // check _chiseInstance param if it is set use it else use recently active chise instance
    var chiseInstance = _chiseInstance || appUtilities.getActiveChiseInstance();

    // get the associated cy instance
    var cy = chiseInstance.getCy();

    // get current general properties for cy instance
    var currentGeneralProperties = appUtilities.getScratch(cy, 'currentGeneralProperties');

    if (currentGeneralProperties.recalculateLayoutOnComplexityManagement )
    {
        //Show all and perform incremental layout
        chiseInstance.showAllAndPerformLayout(this.triggerIncrementalLayout.bind(this, cy));
    }
    else
    {
        //Just show them all
        chiseInstance.showAll();
    }
};

// Hides nodes and perform incremental layout afterward if Rearrange option is checked
appUtilities.hideNodesSmart = function(eles, _chiseInstance) {

    // check _chiseInstance param if it is set use it else use recently active chise instance
    var chiseInstance = _chiseInstance || appUtilities.getActiveChiseInstance();

    // get the associated cy instance
    var cy = chiseInstance.getCy();

    // get current general properties for cy instance
    var currentGeneralProperties = appUtilities.getScratch(cy, 'currentGeneralProperties');

    if (currentGeneralProperties.recalculateLayoutOnComplexityManagement )
    {
        //Put them near node and perform incremental layout
        chiseInstance.hideAndPerformLayout(eles, this.triggerIncrementalLayout.bind(this, cy));
    }
    else
    {
        //Just show them
        chiseInstance.hideNodesSmart(eles);
    }
};

appUtilities.mapColorSchemes = mapColorSchemes = {
    'black_white': {
        'name': 'Black and white',
        'preview': ['#ffffff', '#000000'],
        'values': {
            'unspecified entity': '#ffffff',
            'simple chemical': '#ffffff',
            'macromolecule': '#ffffff',
            'nucleic acid feature': '#ffffff',
            'perturbing agent': '#ffffff',
            'source and sink': '#ffffff',
            'complex': '#ffffff',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#ffffff',
            'tag': '#ffffff',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#ffffff',
            'submap': '#ffffff',
            // AF
            'BA plain': '#ffffff',
            'BA unspecified entity': '#ffffff',
            'BA simple chemical': '#ffffff',
            'BA macromolecule': '#ffffff',
            'BA nucleic acid feature': '#ffffff',
            'BA perturbing agent': '#ffffff',
            'BA complex': '#ffffff',
            'delay': '#ffffff'
        }
    },
    'greyscale': {
        'name': 'Greyscale',
        'preview': ['#ffffff', '#f0f0f0', '#d9d9d9', '#bdbdbd'],
        'invert': 'inverse_greyscale',
        'values': {
            'unspecified entity': '#ffffff',
            'simple chemical': '#bdbdbd',
            'macromolecule': '#bdbdbd',
            'nucleic acid feature': '#bdbdbd',
            'perturbing agent': '#bdbdbd',
            'source and sink': '#ffffff',
            'complex': '#d9d9d9',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#ffffff',
            'tag': '#ffffff',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f0f0f0',
            'submap': '#f0f0f0',
            // AF
            'BA plain': '#ffffff',
            'BA unspecified entity': '#ffffff',
            'BA simple chemical': '#bdbdbd',
            'BA macromolecule': '#bdbdbd',
            'BA nucleic acid feature': '#bdbdbd',
            'BA perturbing agent': '#bdbdbd',
            'BA complex': '#d9d9d9',
            'delay': '#ffffff'
        }
    },
    'inverse_greyscale': {
        'name': 'Inverse greyscale',
        'preview': ['#bdbdbd', '#d9d9d9', '#f0f0f0', '#ffffff'],
        'invert': 'greyscale',
        'values': {
            'unspecified entity': '#f0f0f0',
            'simple chemical': '#f0f0f0',
            'macromolecule': '#f0f0f0',
            'nucleic acid feature': '#f0f0f0',
            'perturbing agent': '#f0f0f0',
            'source and sink': '#f0f0f0',
            'complex': '#d9d9d9',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f0f0f0',
            'tag': '#f0f0f0',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#bdbdbd',
            'submap': '#bdbdbd',
            // AF
            'BA plain': '#f0f0f0',
            'BA unspecified entity': '#f0f0f0',
            'BA simple chemical': '#f0f0f0',
            'BA macromolecule': '#f0f0f0',
            'BA nucleic acid feature': '#f0f0f0',
            'BA perturbing agent': '#f0f0f0',
            'BA complex': '#d9d9d9',
            'delay': '#ffffff'
        }
    },
    'blue_scale': {
        'name': 'Blue scale',
        'preview': ['#ffffff', '#eff3ff', '#c6dbef', '#9ecae1'],
        'invert': 'inverse_blue_scale',
        'values': {
            'unspecified entity': '#9ecae1',
            'simple chemical': '#9ecae1',
            'macromolecule': '#9ecae1',
            'nucleic acid feature': '#9ecae1',
            'perturbing agent': '#9ecae1',
            'source and sink': '#9ecae1',
            'complex': '#c6dbef',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#9ecae1',
            'tag': '#9ecae1',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#eff3ff',
            'submap': '#eff3ff',
            // AF
            'BA plain': '#9ecae1',
            'BA unspecified entity': '#9ecae1',
            'BA simple chemical': '#9ecae1',
            'BA macromolecule': '#9ecae1',
            'BA nucleic acid feature': '#9ecae1',
            'BA perturbing agent': '#9ecae1',
            'BA complex': '#c6dbef',
            'delay': '#ffffff'
        }
    },
    'inverse_blue_scale': {
        'name': 'Inverse blue scale',
        'preview': ['#9ecae1', '#c6dbef', '#eff3ff', '#ffffff'],
        'invert': 'blue_scale',
        'values': {
            'unspecified entity': '#eff3ff',
            'simple chemical': '#eff3ff',
            'macromolecule': '#eff3ff',
            'nucleic acid feature': '#eff3ff',
            'perturbing agent': '#eff3ff',
            'source and sink': '#eff3ff',
            'complex': '#c6dbef',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#eff3ff',
            'tag': '#eff3ff',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#9ecae1',
            'submap': '#9ecae1',
            // AF
            'BA plain': '#eff3ff',
            'BA unspecified entity': '#eff3ff',
            'BA simple chemical': '#eff3ff',
            'BA macromolecule': '#eff3ff',
            'BA nucleic acid feature': '#eff3ff',
            'BA perturbing agent': '#eff3ff',
            'BA complex': '#c6dbef',
            'delay': '#ffffff'
        }
    },
    'opposed_red_blue': {
        'name': 'Red blue',
        'preview': ['#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de'],
        'invert': 'opposed_red_blue2',
        'values': {
            'unspecified entity': '#f7f7f7',
            'simple chemical': '#fddbc7',
            'macromolecule': '#92c5de',
            'nucleic acid feature': '#f4a582',
            'perturbing agent': '#f7f7f7',
            'source and sink': '#f7f7f7',
            'complex': '#d1e5f0',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f7f7f7',
            'tag': '#f7f7f7',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f7f7f7',
            'submap': '#f7f7f7',
            // AF
            'BA plain': '#f7f7f7',
            'BA unspecified entity': '#f7f7f7',
            'BA simple chemical': '#fddbc7',
            'BA macromolecule': '#92c5de',
            'BA nucleic acid feature': '#f4a582',
            'BA perturbing agent': '#f7f7f7',
            'BA complex': '#d1e5f0',
            'delay': '#ffffff'
        }
    },
    'opposed_red_blue2': {
        'name': 'Red blue 2',
        'preview': ['#92c5de', '#d1e5f0', '#f7f7f7', '#fddbc7', '#f4a582'],
        'invert': 'opposed_red_blue',
        'values': {
            'unspecified entity': '#f7f7f7',
            'simple chemical': '#d1e5f0',
            'macromolecule': '#f4a582',
            'nucleic acid feature': '#92c5de',
            'perturbing agent': '#f7f7f7',
            'source and sink': '#f7f7f7',
            'complex': '#fddbc7',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f7f7f7',
            'tag': '#f7f7f7',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f7f7f7',
            'submap': '#f7f7f7',
            // AF
            'BA plain': '#f7f7f7',
            'BA unspecified entity': '#f7f7f7',
            'BA simple chemical': '#d1e5f0',
            'BA macromolecule': '#f4a582',
            'BA nucleic acid feature': '#92c5de',
            'BA perturbing agent': '#f7f7f7',
            'BA complex': '#fddbc7',
            'delay': '#ffffff'
        }
    },
    'opposed_green_brown': {
        'name': 'Green brown',
        'preview': ['#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1'],
        'invert': 'opposed_green_brown2',
        'values': {
            'unspecified entity': '#f5f5f5',
            'simple chemical': '#f6e8c3',
            'macromolecule': '#80cdc1',
            'nucleic acid feature': '#dfc27d',
            'perturbing agent': '#f5f5f5',
            'source and sink': '#f5f5f5',
            'complex': '#c7eae5',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f5f5f5',
            'tag': '#f5f5f5',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f5f5f5',
            'submap': '#f5f5f5',
            // AF
            'BA plain': '#f5f5f5',
            'BA unspecified entity': '#f5f5f5',
            'BA simple chemical': '#f6e8c3',
            'BA macromolecule': '#80cdc1',
            'BA nucleic acid feature': '#dfc27d',
            'BA perturbing agent': '#f5f5f5',
            'BA complex': '#c7eae5',
            'delay': '#ffffff'
        }
    },
    'opposed_green_brown2': {
        'name': 'Green brown 2',
        'preview': ['#80cdc1', '#c7eae5', '#f5f5f5', '#f6e8c3', '#dfc27d'],
        'invert': 'opposed_green_brown',
        'values': {
            'unspecified entity': '#f5f5f5',
            'simple chemical': '#c7eae5',
            'macromolecule': '#dfc27d',
            'nucleic acid feature': '#80cdc1',
            'perturbing agent': '#f5f5f5',
            'source and sink': '#f5f5f5',
            'complex': '#f6e8c3',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f5f5f5',
            'tag': '#f5f5f5',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f5f5f5',
            'submap': '#f5f5f5',
            // AF
            'BA plain': '#f5f5f5',
            'BA unspecified entity': '#f5f5f5',
            'BA simple chemical': '#c7eae5',
            'BA macromolecule': '#dfc27d',
            'BA nucleic acid feature': '#80cdc1',
            'BA perturbing agent': '#f5f5f5',
            'BA complex': '#f6e8c3',
            'delay': '#ffffff'
        }
    },
    'opposed_purple_brown': {
        'name': 'Purple brown',
        'preview': ['#fdb863', '#fee0b6', '#f7f7f7', '#d8daeb', '#b2abd2'],
        'invert': 'opposed_purple_brown2',
        'values': {
            'unspecified entity': '#f7f7f7',
            'simple chemical': '#fee0b6',
            'macromolecule': '#b2abd2',
            'nucleic acid feature': '#fdb863',
            'perturbing agent': '#f7f7f7',
            'source and sink': '#f7f7f7',
            'complex': '#d8daeb',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f7f7f7',
            'tag': '#f7f7f7',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f7f7f7',
            'submap': '#f7f7f7',
            // AF
            'BA plain': '#f7f7f7',
            'BA unspecified entity': '#f7f7f7',
            'BA simple chemical': '#fee0b6',
            'BA macromolecule': '#b2abd2',
            'BA nucleic acid feature': '#fdb863',
            'BA perturbing agent': '#f7f7f7',
            'BA complex': '#d8daeb',
            'delay': '#ffffff'
        }
    },
    'opposed_purple_brown2': {
        'name': 'Purple brown 2',
        'preview': ['#b2abd2', '#d8daeb', '#f7f7f7', '#fee0b6', '#fdb863'],
        'invert': 'opposed_purple_brown',
        'values': {
            'unspecified entity': '#f7f7f7',
            'simple chemical': '#d8daeb',
            'macromolecule': '#fdb863',
            'nucleic acid feature': '#b2abd2',
            'perturbing agent': '#f7f7f7',
            'source and sink': '#f7f7f7',
            'complex': '#fee0b6',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f7f7f7',
            'tag': '#f7f7f7',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f7f7f7',
            'submap': '#f7f7f7',
            // AF
            'BA plain': '#f7f7f7',
            'BA unspecified entity': '#f7f7f7',
            'BA simple chemical': '#d8daeb',
            'BA macromolecule': '#fdb863',
            'BA nucleic acid feature': '#b2abd2',
            'BA perturbing agent': '#f7f7f7',
            'BA complex': '#fee0b6',
            'delay': '#ffffff'
        }
    },
    'opposed_purple_green': {
        'name': 'Purple green',
        'preview': ['#a6dba0', '#d9f0d3', '#f7f7f7', '#e7d4e8', '#c2a5cf'],
        'invert': 'opposed_purple_green2',
        'values': {
            'unspecified entity': '#f7f7f7',
            'simple chemical': '#d9f0d3',
            'macromolecule': '#c2a5cf',
            'nucleic acid feature': '#a6dba0',
            'perturbing agent': '#f7f7f7',
            'source and sink': '#f7f7f7',
            'complex': '#e7d4e8',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f7f7f7',
            'tag': '#f7f7f7',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f7f7f7',
            'submap': '#f7f7f7',
            // AF
            'BA plain': '#f7f7f7',
            'BA unspecified entity': '#f7f7f7',
            'BA simple chemical': '#d9f0d3',
            'BA macromolecule': '#c2a5cf',
            'BA nucleic acid feature': '#a6dba0',
            'BA perturbing agent': '#f7f7f7',
            'BA complex': '#e7d4e8',
            'delay': '#ffffff'
        }
    },
    'opposed_purple_green2': {
        'name': 'Purple green 2',
        'preview': ['#c2a5cf', '#e7d4e8', '#f7f7f7', '#d9f0d3', '#a6dba0'],
        'invert': 'opposed_purple_green',
        'values': {
            'unspecified entity': '#f7f7f7',
            'simple chemical': '#e7d4e8',
            'macromolecule': '#a6dba0',
            'nucleic acid feature': '#c2a5cf',
            'perturbing agent': '#f7f7f7',
            'source and sink': '#f7f7f7',
            'complex': '#d9f0d3',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#f7f7f7',
            'tag': '#f7f7f7',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#f7f7f7',
            'submap': '#f7f7f7',
            // AF
            'BA plain': '#f7f7f7',
            'BA unspecified entity': '#f7f7f7',
            'BA simple chemical': '#e7d4e8',
            'BA macromolecule': '#a6dba0',
            'BA nucleic acid feature': '#c2a5cf',
            'BA perturbing agent': '#f7f7f7',
            'BA complex': '#d9f0d3',
            'delay': '#ffffff'
        }
    },
    'opposed_grey_red': {
        'name': 'Grey red',
        'preview': ['#bababa', '#e0e0e0', '#ffffff', '#fddbc7', '#f4a582'],
        'invert': 'opposed_grey_red2',
        'values': {
            'unspecified entity': '#ffffff',
            'simple chemical': '#e0e0e0',
            'macromolecule': '#f4a582',
            'nucleic acid feature': '#bababa',
            'perturbing agent': '#ffffff',
            'source and sink': '#ffffff',
            'complex': '#fddbc7',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#ffffff',
            'tag': '#ffffff',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#ffffff',
            'submap': '#ffffff',
            // AF
            'BA plain': '#ffffff',
            'BA unspecified entity': '#ffffff',
            'BA simple chemical': '#e0e0e0',
            'BA macromolecule': '#f4a582',
            'BA nucleic acid feature': '#bababa',
            'BA perturbing agent': '#ffffff',
            'BA complex': '#fddbc7',
            'delay': '#ffffff'
        }
    },
    'opposed_grey_red2': {
        'name': 'Grey red 2',
        'preview': ['#f4a582', '#fddbc7', '#ffffff', '#e0e0e0', '#bababa'],
        'invert': 'opposed_grey_red',
        'values': {
            'unspecified entity': '#ffffff',
            'simple chemical': '#fddbc7',
            'macromolecule': '#bababa',
            'nucleic acid feature': '#f4a582',
            'perturbing agent': '#ffffff',
            'source and sink': '#ffffff',
            'complex': '#e0e0e0',
            'process': '#ffffff',
            'omitted process': '#ffffff',
            'uncertain process': '#ffffff',
            'association': '#ffffff',
            'dissociation': '#ffffff',
            'phenotype': '#ffffff',
            'tag': '#ffffff',
            'consumption': '#ffffff',
            'production': '#ffffff',
            'modulation': '#ffffff',
            'stimulation': '#ffffff',
            'catalysis': '#ffffff',
            'inhibition': '#ffffff',
            'necessary stimulation': '#ffffff',
            'logic arc': '#ffffff',
            'equivalence arc': '#ffffff',
            'and': '#ffffff',
            'or': '#ffffff',
            'not': '#ffffff',
            'compartment': '#ffffff',
            'submap': '#ffffff',
            // AF
            'BA plain': '#ffffff',
            'BA unspecified entity': '#ffffff',
            'BA simple chemical': '#fddbc7',
            'BA macromolecule': '#bababa',
            'BA nucleic acid feature': '#f4a582',
            'BA perturbing agent': '#ffffff',
            'BA complex': '#e0e0e0',
            'delay': '#ffffff'
        }
    }
};
// set multimers to be the same as their original elements
// just to avoid typing it manually in the mapColorSchemes dictionary
for(var scheme in mapColorSchemes){
    mapColorSchemes[scheme]['values']['nucleic acid feature multimer'] = mapColorSchemes[scheme]['values']['nucleic acid feature'];
    mapColorSchemes[scheme]['values']['macromolecule multimer'] = mapColorSchemes[scheme]['values']['macromolecule'];
    mapColorSchemes[scheme]['values']['simple chemical multimer'] = mapColorSchemes[scheme]['values']['simple chemical'];
    mapColorSchemes[scheme]['values']['complex multimer'] = mapColorSchemes[scheme]['values']['complex'];
}

// go through eles, mapping the id of these elements to values that were mapped to their data().class
// classMap is of the form: {ele.data().class: value}
// return object of the form: {ele.id: value}
appUtilities.mapEleClassToId = function(eles, classMap) {
    result = {};
    for( var i = 0; i < eles.length; i++ ){
        ele = eles[i];
        result[ele.id()] = classMap[ele.data().class];
    }
    return result;
};

// change the global style of the map by applying the current color scheme
appUtilities.applyMapColorScheme = function(newColorScheme, self, _cy) {

    // if _cy param is set use it else use the recently active cy instance
    var cy = _cy || appUtilities.getActiveCy();

    var eles = cy.nodes();
    var idMap = appUtilities.mapEleClassToId(eles, mapColorSchemes[newColorScheme]['values']);
    var collapsedChildren = cy.expandCollapse('get').getAllCollapsedChildrenRecursively().filter("node");
    var collapsedIdMap = appUtilities.mapEleClassToId(collapsedChildren, mapColorSchemes[newColorScheme]['values']);
    var chiseInstance = appUtilities.getActiveChiseInstance();

    var actions = [];
    // edit style of the current map elements
    actions.push({name: "changeData", param: {eles: eles, name: 'background-color', valueMap: idMap}});
    // collapsed nodes' style should also be changed, special edge case
    actions.push({name: "changeDataDirty", param: {eles: collapsedChildren, name: 'background-color', valueMap: collapsedIdMap}});

    actions.push({name: "refreshColorSchemeMenu", param: {value: newColorScheme, self: self}});
    // set to be the default as well
    for(var nodeClass in mapColorSchemes[newColorScheme]['values']){
        classBgColor = mapColorSchemes[newColorScheme]['values'][nodeClass];
        // nodeClass may not be defined in the defaultProperties (for edges, for example)
        if(nodeClass in chiseInstance.elementUtilities.defaultProperties){
            actions.push({name: "setDefaultProperty", param: {class: nodeClass, name: 'background-color', value: classBgColor}});
        }
    }

    cy.undoRedo().do("batch", actions);
    // ensure the menu is updated accordingly
    document.getElementById("map-color-scheme_preview_" + newColorScheme).style.border = "3px solid";
};

// the 3 following functions are related to the handling of the dynamic image
// used during drag and drop of palette nodes
appUtilities.dragImageMouseMoveHandler = function (e) {
    $("#drag-image").css({left:e.pageX, top:e.pageY});
};

appUtilities.addDragImage = function (img, width, height){
    // see: http://stackoverflow.com/questions/38838508/make-a-dynamic-image-follow-mouse
    $(document.body).append('<img id="drag-image" src="app/img/nodes/'+img+'" style="position: absolute;'+
        'width:'+width+'; height:'+height+'; left: -100px; top: -100px;" >');
    $(document).on("mousemove", appUtilities.dragImageMouseMoveHandler);
};

appUtilities.removeDragImage = function () {
    $("#drag-image").remove();
    $(document).off("mousemove", appUtilities.dragImageMouseMoveHandler);
};

appUtilities.getAllStyles = function (_cy) {

    // use _cy param if it is set else use the recently active cy instance
    var cy = _cy || appUtilities.getActiveCy();

    var collapsedChildren = cy.expandCollapse('get').getAllCollapsedChildrenRecursively();
    var collapsedChildrenNodes = collapsedChildren.filter("node");
    var nodes = cy.nodes().union(collapsedChildrenNodes);
    var collapsedChildrenEdges = collapsedChildren.filter("edge");
    var edges = cy.edges().union(collapsedChildrenEdges);

    // first get all used colors and background images, then deal with them and keep reference to them
    var colorUsed = appUtilities.getColorsFromElements(nodes, edges);
    var imagesUsed = appUtilities.getImagesFromElements(nodes);

    var nodePropertiesToXml = {
        'background-color': 'fill',
        'background-opacity': 'background-opacity', // not an sbgnml XML attribute, but used with fill
        'border-color': 'stroke',
        'border-width': 'strokeWidth',
        'font-size': 'fontSize',
        'font-weight': 'fontWeight',
        'font-style': 'fontStyle',
        'font-family': 'fontFamily',
        'background-image': 'backgroundImage',
        'background-fit': 'backgroundFit',
        'background-position-x': 'backgroundPosX',
        'background-position-y': 'backgroundPosY',
        'background-height': 'backgroundHeight',
        'background-width': 'backgroundWidth',
        'background-image-opacity': 'backgroundImageOpacity',
    };
    var edgePropertiesToXml = {
        'line-color': 'stroke',
        'width': 'strokeWidth'
    };

    function getStyleHash (element, properties) {
        var hash = "";
        for(var cssProp in properties){
            if (element.data(cssProp)) {
                if(cssProp === 'background-image'){
                    var imgs = appUtilities.elementValidImages(element);
                    hash += appUtilities.elementValidImageIDs(imgs, imagesUsed);
                }
                else
                    hash += element.data(cssProp).toString();
            }
            else {
                hash += "";
            }
        }
        return hash;
    }

    function getStyleProperties (element, properties) {
        var props = {};
        for(var cssProp in properties){
            if (element.data(cssProp)) {
                //if it is a color property, replace it with corresponding id
                if (cssProp == 'background-color' || cssProp == 'border-color' || cssProp == 'line-color') {
                    var validColor = appUtilities.elementValidColor(element, cssProp);
                    var colorID = colorUsed[validColor];
                    props[properties[cssProp]] = colorID;
                }
                //if it is background image property, replace it with corresponding id
                else if(cssProp == 'background-image'){
                    var imgs = appUtilities.elementValidImages(element);
                    props[properties[cssProp]] = appUtilities.elementValidImageIDs(imgs, imagesUsed);
                }
                else{
                    props[properties[cssProp]] = element.data(cssProp);
                }
            }
        }
        return props;
    }

    // populate the style structure for nodes
    var styles = {}; // list of styleKey pointing to a list of properties and a list of nodes
    for(var i=0; i<nodes.length; i++) {
        var node = nodes[i];
        var styleKey = "node"+getStyleHash(node, nodePropertiesToXml);
        if (!styles.hasOwnProperty(styleKey)) { // new style encountered, init this new style
            var properties = getStyleProperties(node, nodePropertiesToXml);
            styles[styleKey] = {
                idList: [],
                properties: properties
            };
        }
        var currentNodeStyle = styles[styleKey];
        // add current node id to this style
        currentNodeStyle.idList.push(node.data('id'));
    }

    // populate the style structure for edges
    for(var i=0; i<edges.length; i++) {
        var edge = edges[i];
        var styleKey = "edge"+getStyleHash(edge, edgePropertiesToXml);
        if (!styles.hasOwnProperty(styleKey)) { // new style encountered, init this new style
            var properties = getStyleProperties(edge, edgePropertiesToXml);
            styles[styleKey] = {
                idList: [],
                properties: properties
            };
        }
        var currentEdgeStyle = styles[styleKey];
        // add current node id to this style
        currentEdgeStyle.idList.push(edge.data('id'));
    }

    var containerBgColor = $(cy.container()).css('background-color');
    if (containerBgColor == "transparent") {
        containerBgColor = "#ffffff";
    }
    else {
        containerBgColor = getXmlValidColor(containerBgColor);
    }

    return {
        colors: colorUsed,
        images: imagesUsed,
        background: containerBgColor,
        styles: styles
    };
};

// accepts short or long hex or rgb color, return sbgnml compliant color value (= long hex)
// can optionnally convert opacity value and return a 8 characer hex color
function getXmlValidColor(color, opacity) {
    var finalColor = chroma(color).hex();
    if (typeof opacity === 'undefined') {
        return finalColor;
    }
    else { // append opacity as hex
        // see http://stackoverflow.com/questions/2877322/convert-opacity-to-hex-in-javascript
        return finalColor + Math.floor(opacity * 255).toString(16);
    }
}

appUtilities.elementValidColor = function (ele, colorProperty) {
    if (ele.data(colorProperty)) {
        if (colorProperty == 'background-color') { // special case, take in count the opacity
            if (ele.data('background-opacity')) {
                return getXmlValidColor(ele.data('background-color'), ele.data('background-opacity'));
            }
            else {
                return getXmlValidColor(ele.data('background-color'));
            }
        }
        else { // general case
            return getXmlValidColor(ele.data(colorProperty));
        }
    }
    else { // element don't have that property
        return undefined;
    }
};

appUtilities.elementValidImages = function (ele) {
    if (ele.isNode() && ele.data('background-image')) {
        return ele.data('background-image').split(" ");
    }
    else { // element don't have that property
        return undefined;
    }
};

appUtilities.elementValidImageIDs = function (imgs, imagesUsed) {
    if(imgs && imagesUsed && imgs.length > 0){
        var ids = [];
        imgs.forEach(function(img){
            ids.push(imagesUsed[img]);
        });
        return ids.join(" ");
    }
    else{
        return undefined;
    }
}

/*
  returns: {
    xmlValid: id
  }
*/
appUtilities.getColorsFromElements = function (nodes, edges) {
    var colorHash = {};
    var colorID = 0;
    for(var i=0; i<nodes.length; i++) {
        var node = nodes[i];
        var bgValidColor = appUtilities.elementValidColor(node, 'background-color');
        if (!colorHash[bgValidColor]) {
            colorID++;
            colorHash[bgValidColor] = 'color_' + colorID;
        }

        var borderValidColor = appUtilities.elementValidColor(node, 'border-color');
        if (!colorHash[borderValidColor]) {
            colorID++;
            colorHash[borderValidColor] = 'color_' + colorID;
        }
    }
    for(var i=0; i<edges.length; i++) {
        var edge = edges[i];
        var lineValidColor = appUtilities.elementValidColor(edge, 'line-color');
        if (!colorHash[lineValidColor]) {
            colorID++;
            colorHash[lineValidColor] = 'color_' + colorID;
        }
    }
    return colorHash;
}

appUtilities.getImagesFromElements = function (nodes) {
    var imageHash = {};
    var imageID = 0;
    for(var i=0; i<nodes.length; i++) {
        var node = nodes[i];
        var validImages = appUtilities.elementValidImages(node);
        if(!validImages)
            continue;
        validImages.forEach(function(img){
            if (!imageHash[img]) {
                imageID++;
                imageHash[img] = 'image_' + imageID;
            }
        });
    }

    return imageHash;
}

/**
 * updates current general properties and refreshes map
 * @mapProperties : a set of properties as object
 */
appUtilities.setMapProperties = function(mapProperties, _chiseInstance) {

    // use _chiseInstance param if it is set else use the recently active chise instance
    var chiseInstance = _chiseInstance || appUtilities.getActiveChiseInstance();

    // use associated cy instance
    var cy = chiseInstance.getCy();

    // get current general properties for cy
    var currentGeneralProperties = appUtilities.getScratch(cy, 'currentGeneralProperties');

    for (property in mapProperties){
        var value = mapProperties[property];
        // convert strings to correct appropriate types
        if (value == 'true' || value == 'false')  // if boolean
            currentGeneralProperties[property] = (value == 'true');
        else if (Number(value))  // if number
            currentGeneralProperties[property] = Number(value);
        else  // if string
            currentGeneralProperties[property] = value;
    }
    // refresh map with new settings
    chiseInstance.setShowComplexName(currentGeneralProperties.showComplexName);
    chiseInstance.refreshPaddings(); // Refresh/recalculate paddings

    if (currentGeneralProperties.enablePorts) {
        chiseInstance.enablePorts();
    }
    else {
        chiseInstance.disablePorts();
    }

    if (currentGeneralProperties.allowCompoundNodeResize) {
        chiseInstance.considerCompoundSizes();
    }
    else {
        chiseInstance.omitCompoundSizes();
    }

    cy.edges().css('arrow-scale', currentGeneralProperties.arrowScale);
    cy.style().update();

    // reset 'currentGeneralProperties' on scratchpad of cy
    appUtilities.setScratch(cy, 'currentGeneralProperties', currentGeneralProperties);

    // use the panel id as the network key
    var networkKey = cy.container().id;

    // update the network tab description as the map name is just changed
    appUtilities.updateNetworkTabDesc(networkKey);
};

// filter the map properties of given object
appUtilities.filterMapProperties = function(obj) {
    var mapProps = {};

    for ( var prop in obj ) {
        if (chise.validMapProperties[prop]) {
            mapProps[prop] = obj[prop];
        }
    }

    return mapProps;
};

appUtilities.launchWithModelFile = function() {

    var paramObj = getQueryParameters();
    var url_path = paramObj.url;
    var uri_path = paramObj.uri;

    var chiseInstance = appUtilities.getActiveChiseInstance();
    var cyInstance = chiseInstance.getCy();

    // attach url params to the object to be used on sbgnvizLoadFileEnd event
    // it will be cleared immediately after usage
    appUtilities.setScratch(cyInstance, 'urlParams', paramObj);

    var promptInvalidURIWarning = this.promptInvalidURIWarning;
    var promptInvalidURLWarning = this.promptInvalidURLWarning;

    if(url_path != undefined)
        loadFromURL(url_path, chiseInstance, promptInvalidURLWarning);
    else if(uri_path != undefined)
        loadFromURI(uri_path, chiseInstance, promptInvalidURIWarning);

    function loadFromURL(filepath, chiseInstance, promptInvalidURLWarning){
        // get current general properties
        var currentGeneralProperties = appUtilities.getScratch(cyInstance, 'currentGeneralProperties');
        var currentInferNestingOnLoad = currentGeneralProperties.inferNestingOnLoad;

        var loadCallbackSBGNMLValidity = function (text) {
            $.ajax({
                type: 'post',
                url: "/utilities/validateSBGNML",
                data: {sbgnml: text},
                success: function(data){
                    if(data.length == 0) {
                        console.log("Xsd validation OK");
                    }
                    else {
                        console.error("Xsd validation failed. Errors:", data);
                    }
                },
                error: function(req, status, err) {
                    console.error("Error during file validation", status, err);
                }
            });
        }

        var loadCallbackInvalidityWarning  = function () {
            promptInvalidURLWarning.render();
        }

        if(filepath == undefined){
            loadCallbackInvalidityWarning();
            return;
        }

        var filename = filepath.split('/');
        if(filename.length > 0)
            filename = filename[filename.length - 1];
        else
            filename = 'remote';

        var fileExtension = filename.split('.');
        if(fileExtension.length > 0)
            fileExtension = fileExtension[fileExtension.length - 1];
        else
            fileExtension = 'txt';

        $.ajax({
            type: 'get',
            url: filepath,
            success: function(result){
                var fileToLoad = new File([result], filename, {
                    type: 'text/' + fileExtension,
                    lastModified: Date.now()
                });

                currentGeneralProperties.inferNestingOnLoad = true;
                chiseInstance.loadSBGNMLFile(fileToLoad, loadCallbackSBGNMLValidity, loadCallbackInvalidityWarning);
            },
            error: function(xhr, ajaxOptions, thrownError){
                loadCallbackInvalidityWarning();
            }
        });

        $(document).one("sbgnvizLoadFileEnd", function(){
            currentGeneralProperties.inferNestingOnLoad = currentInferNestingOnLoad;
            appUtilities.mapTabGeneralPanel.render();
        });

    }

    function loadFromURI(uri, chiseInstance, promptInvalidURIWarning){

        var queryURL = "http://www.pathwaycommons.org/pc2/get?uri="
            + uri + "&format=SBGN";

        var filename = uri + '.sbgnml';
        var cyInstance = chiseInstance.getCy();

        chiseInstance.startSpinner('paths-byURI-spinner');

        var currentGeneralProperties = appUtilities.getScratch(cyInstance, 'currentGeneralProperties');
        var currentInferNestingOnLoad = currentGeneralProperties.inferNestingOnLoad;

        $.ajax({
            url: queryURL,
            type: 'GET',
            success: function (data) {
                if (data == null) {
                    chiseInstance.endSpinner('paths-byURI-spinner');
                    promptInvalidURIWarning.render();
                }
                else {
                    $(document).trigger('sbgnvizLoadFile', [filename, cyInstance]);
                    currentGeneralProperties.inferNestingOnLoad = false;
                    chiseInstance.updateGraph(chiseInstance.convertSbgnmlToJson(data), undefined, true);
                    currentGeneralProperties.inferNestingOnLoad = currentInferNestingOnLoad;
                    chiseInstance.endSpinner('paths-byURI-spinner');
                    $(document).trigger('sbgnvizLoadFileEnd', [filename,  cyInstance]);
                }
            }
        });
    }

    // returns an object that contains name-value pairs of query parameters
    function getQueryParameters(url) {
        if (!url){
            url = window.location.href;
        }

        var queryParams = {};
        // Parse the query sting into an object please see:
        // https://stevenbenner.com/2010/03/javascript-regex-trick-parse-a-query-string-into-an-object/
        url.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function($0, name, $2, value) {
                if (value !== undefined) {
                    var lowerCaseName = name.toLowerCase();
                    // for 'uri' and 'url' parameters provide case insensitivity by converting to lower case
                    if (lowerCaseName === 'url' || lowerCaseName === 'uri') {
                        name = lowerCaseName;
                    }
                    queryParams[name] = value;
                }
            }
        );

        return queryParams;
    }
}

appUtilities.navigateToOtherEnd = function(edge, mouse_rend, mouse_normal) {

    if(!edge.isEdge()){
        return;
    }

    var cy = appUtilities.getActiveCy();
    var edge_pts = edge._private.rscratch.allpts;

    var source_node = edge.source();
    var target_node = edge.target();

    var source_position = {x: edge_pts[0], y: edge_pts[1]};
    var target_position = {x: edge_pts[edge_pts.length-2], y: edge_pts[edge_pts.length-1]};

    var source_loc = Math.pow((mouse_normal.x - source_position.x), 2) + Math.pow((mouse_normal.y - source_position.y), 2);
    var target_loc = Math.pow((mouse_normal.x - target_position.x), 2) + Math.pow((mouse_normal.y - target_position.y), 2);

    // Animation direction
    var source_to_target = source_loc < target_loc;

    // Change direction of points according to animation direction
    if(!source_to_target){
        var new_edge_pts = [];
        for(var i = edge_pts.length-1; i > 0; i=i-2){
            new_edge_pts.push(edge_pts[i-1], edge_pts[i]);
        }
        edge_pts = new_edge_pts;
    }

    var starting_point = 0;
    var minimum;
    for(var i = 0; i < edge_pts.length-3; i=i+2){
        var a_b = Math.pow((mouse_normal.x-edge_pts[i]), 2) + Math.pow((mouse_normal.y-edge_pts[i+1]), 2);
        a_b = Math.sqrt(a_b);

        var b_c = Math.pow((mouse_normal.x-edge_pts[i+2]), 2) + Math.pow((mouse_normal.y-edge_pts[i+3]), 2);
        b_c = Math.sqrt(b_c);

        var a_c = Math.pow((edge_pts[i+2]-edge_pts[i]), 2) + Math.pow((edge_pts[i+3]-edge_pts[i+1]), 2);
        a_c = Math.sqrt(a_c);

        var difference = Math.abs(a_c - a_b - b_c);

        if(minimum === undefined || minimum > difference){
            minimum = difference;
            starting_point = i+2;
        }
    }

    var start_node = source_to_target ? source_node : target_node;
    var s_normal = start_node.position();
    var s_rendered = start_node.renderedPosition();
    var zoom_level = cy.zoom();
    var finished = (edge_pts.length-starting_point-1)/2;

    // Animate for each bend point
    for(var i = starting_point; i < edge_pts.length-1; i=i+2){
        // Convert normal position into rendered position
        var rend_x = (edge_pts[i] - s_normal.x) * zoom_level + s_rendered.x;
        var rend_y = (edge_pts[i+1] - s_normal.y) * zoom_level + s_rendered.y;

        cy.animate({
            duration: 1400,
            panBy: {x: (mouse_rend.x-rend_x), y: (mouse_rend.y-rend_y)},
            easing: 'ease',
            complete: function(){
                finished--;
                if(finished <= 0)
                    (source_to_target ? target_node : source_node).select();
            }
        });
    }



}

//Info-box drag handlers
appUtilities.relocationDragHandler;
appUtilities.RelocationHandler;

var relocatedNode;

//Enables info-box relocation if a node is selected
appUtilities.relocateInfoBoxes = function(node){
    var cy = this.getActiveCy();
    this.disableInfoBoxRelocation();
    //Abort if node has no info-boxes or selected ele is not a node
    if (node.data("auxunitlayouts") === undefined || node.data("statesandinfos").length === 0 || !node.isNode()) {
        this.disableInfoBoxRelocation();
        return;
    }
    cy.nodes(":selected").unselect();
    relocatedNode = node;
    this.enableInfoBoxRelocation(node);
}

//Checks whether a info-box is selected in a given mouse position
appUtilities.checkMouseContainsInfoBox = function(unit, mouse_down_x, mouse_down_y){
    var box = unit.bbox;
    var instance = this.getActiveSbgnvizInstance();
    var cy = this.getActiveCy();
    var coords = instance.classes.AuxiliaryUnit.getAbsoluteCoord(unit, cy);
    var x_loc = coords.x;
    var y_loc = coords.y;
    var width = box.w;
    var height = box.h;
    return ((mouse_down_x >= x_loc - width / 2) && (mouse_down_x <= x_loc + width / 2))
        && ( (mouse_down_y >= y_loc - height / 2) && (mouse_down_y <= y_loc + height / 2));
}

//Enables info-box appUtilities.RelocationHandler
appUtilities.enableInfoBoxRelocation = function(node){
    var cy = this.getActiveCy();
    //Disable box movements
    var oldColor = node.data("border-color");
    node.data("border-color", "#d67614");
    var selectedBox;
    var anchorSide;
    cy.on('mousedown', appUtilities.RelocationHandler = function(event){
        //Check whether event contained by infobox of a node
        //Lock the node so that it won't change position when
        //Info boxes are dragged
        cy.autounselectify(true);
        cy.autolock(true);
        var top = node.data('auxunitlayouts').top;
        var bottom = node.data('auxunitlayouts').bottom;
        var right = node.data('auxunitlayouts').right;
        var left = node.data('auxunitlayouts').left;

        //Get mouse positions
        var mouse_down_x = event.position.x;
        var mouse_down_y = event.position.y;
        var instance = appUtilities.getActiveSbgnvizInstance();
        var oldAnchorSide; //Hold old anchor side to modify units
        //Check top units
        if (top !== undefined && selectedBox === undefined) {
            var units = top.units;
            for (var i = units.length-1; i >= 0 ; i--) {
                if (appUtilities.checkMouseContainsInfoBox(units[i], mouse_down_x, mouse_down_y)) {
                    selectedBox = units[i];
                    oldAnchorSide = selectedBox.anchorSide;
                    break;
                }
            }
        }
        //Check right units
        if (right !== undefined && selectedBox === undefined) {
            var units = right.units;
            for (var i = units.length-1; i >= 0 ; i--) {
                if (appUtilities.checkMouseContainsInfoBox(units[i], mouse_down_x, mouse_down_y)) {
                    selectedBox = units[i];
                    oldAnchorSide = selectedBox.anchorSide;
                    break;
                }
            }
        }
        //Check bottom units
        if (bottom !== undefined && selectedBox === undefined) {
            var units = bottom.units;
            for (var i = units.length-1; i >= 0 ; i--) {
                if (appUtilities.checkMouseContainsInfoBox(units[i], mouse_down_x, mouse_down_y)) {
                    selectedBox = units[i];
                    oldAnchorSide = selectedBox.anchorSide;
                    break;
                }
            }
        }
        //Check left units
        if (left !== undefined && selectedBox === undefined) {
            var units = left.units;
            for (var i = units.length-1; i >= 0 ; i--) {
                if (appUtilities.checkMouseContainsInfoBox(units[i], mouse_down_x, mouse_down_y)) {
                    selectedBox = units[i];
                    oldAnchorSide = selectedBox.anchorSide;
                    break;
                }
            }
        }

        //If no info-box found abort
        if (selectedBox === undefined) {
            appUtilities.disableInfoBoxRelocation();
            node.data("border-color", oldColor);
            relocatedNode = undefined;
            return;
        }
        //Else If a info-box contained by event move info-box
        var instance = appUtilities.getActiveSbgnvizInstance();
        var position = node.position();
        selectedBox.dashed = true;
        var last_mouse_x = mouse_down_x;
        var last_mouse_y = mouse_down_y;
        if ((node.data("class") === "compartment" || node.data("class") === "complex")
            && node._private.children !== undefined && node._private.children.length !== 0) {
            var parentWidth = node._private.autoWidth;
            var parentHeight = node._private.autoHeight;
            var padding = node._private.autoPadding;
        }
        else {
            var parentWidth = node.data("bbox").w;
            var parentHeight = node.data("bbox").h;
            var padding = 0;
        }
        var parentX1 = position.x - parentWidth/2 - padding;
        var parentX2 = position.x + parentWidth/2 + padding;
        var parentY1 = position.y - parentHeight/2 - padding;
        var parentY2 = position.y + parentHeight/2 + padding;
        cy.on("mousemove", appUtilities.relocationDragHandler = function(event){
            if (selectedBox === undefined) { //If selected box is undefined somehow abort
                appUtilities.disableInfoBoxRelocation();
                node.data("border-color", oldColor);
                relocatedNode = undefined;
                return;
            }
            //Clear visual cues during relocation
            cy.expandCollapse('get').clearVisualCue(node);
            var drag_x = event.position.x;
            var drag_y = event.position.y;
            var anchorSide = selectedBox.anchorSide;
            var gap, shift_x, shift_y, box_new_x, box_new_y;

            //If anchor side is top or bottom only move in x direction
            if (anchorSide === "top" || anchorSide === "bottom") {
                if (anchorSide === "top") {
                    gap = instance.classes.AuxUnitLayout.getCurrentTopGap();
                }
                else {
                    gap = instance.classes.AuxUnitLayout.getCurrentBottomGap();
                }

                shift_x = drag_x - last_mouse_x;
                box_new_x = selectedBox.bbox.x + shift_x; //Calculate new box position
                //Get absolute position
                var absoluteCoords = instance.classes.AuxiliaryUnit.convertToAbsoluteCoord(selectedBox, box_new_x, selectedBox.bbox.y, cy);
                var newRelativeCoords;
                if (absoluteCoords.x - selectedBox.bbox.w/2 < (parentX1) + gap) { //Box cannot go futher than parentBox + margin on left side
                    newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox,((parentX1) + gap + selectedBox.bbox.w/2),
                        absoluteCoords.y, cy);
                    selectedBox.bbox.x = newRelativeCoords.x;
                }
                else if (absoluteCoords.x + selectedBox.bbox.w/2 > (parentX2) - gap) { //Box cannot go futher than parentBox - margin on right side
                    newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, ((parentX2) - gap - selectedBox.bbox.w/2),
                        absoluteCoords.y, cy);
                    selectedBox.bbox.x = newRelativeCoords.x;
                }
                else { //Else it is already relative
                    selectedBox.bbox.x = box_new_x;
                }
                //If box is at margin points allow it to change anchor side
                //If it on left it can pass left anchor side
                absoluteCoords = instance.classes.AuxiliaryUnit.convertToAbsoluteCoord(selectedBox, selectedBox.bbox.x, selectedBox.bbox.y, cy); //Get current absolute coords
                if (absoluteCoords.x === (parentX1) + gap + selectedBox.bbox.w/2) { //If it is on the left margin allow it to change anchor sides
                    //If it is in the top and mouse moves bottom it can go left anchor
                    if (last_mouse_y < drag_y  && anchorSide === "top") {
                        selectedBox.anchorSide = "left"; //Set new anchor side
                        newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, (parentX1),
                            (parentY1 + instance.classes.AuxUnitLayout.getCurrentLeftGap()), cy);
                        selectedBox.bbox.x = newRelativeCoords.x;
                        selectedBox.bbox.y = newRelativeCoords.y;
                    }
                    else if (last_mouse_y > drag_y && anchorSide === "bottom") { //If it is in the bottom and mouse moves up it can go left anchor side
                        selectedBox.anchorSide = "left"; //Set new anchor side
                        newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, (parentX1),
                            (parentY2 - instance.classes.AuxUnitLayout.getCurrentLeftGap()), cy);
                        selectedBox.bbox.x = newRelativeCoords.x;
                        selectedBox.bbox.y = newRelativeCoords.y;
                    }
                }
                //If it on right it can pass right anchor side, * 2 for relaxation
                else if (absoluteCoords.x  === (parentX2) - gap - selectedBox.bbox.w/2) {
                    if (last_mouse_y < drag_y && anchorSide === "top") {
                        selectedBox.anchorSide = "right"; //Set new anchor side
                        newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, (parentX2),
                            (parentY1 + instance.classes.AuxUnitLayout.getCurrentRightGap()), cy);
                        selectedBox.bbox.x = newRelativeCoords.x;
                        selectedBox.bbox.y = newRelativeCoords.y;
                    }
                    else if (last_mouse_y > drag_y && anchorSide === "bottom") { //If it is in the bottom and mouse moves up it can go left anchor side
                        selectedBox.anchorSide = "right"; //Set new anchor side
                        newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, (parentX2),
                            (parentY2 - instance.classes.AuxUnitLayout.getCurrentRightGap()), cy);
                        selectedBox.bbox.x = newRelativeCoords.x;
                        selectedBox.bbox.y = newRelativeCoords.y;
                    }
                }
            }
            else {
                //If anchor side left or right only move in y direction
                if (anchorSide === "right") {
                    gap = instance.classes.AuxUnitLayout.getCurrentRightGap();
                }
                else {
                    gap = instance.classes.AuxUnitLayout.getCurrentLeftGap();
                }

                shift_y = drag_y - last_mouse_y;
                box_new_y = selectedBox.bbox.y + shift_y; //Calculate new box position

                //Get absolute position
                var absoluteCoords = instance.classes.AuxiliaryUnit.convertToAbsoluteCoord(selectedBox, selectedBox.bbox.x, box_new_y, cy);
                var newRelativeCoords;
                if (absoluteCoords.y - selectedBox.bbox.h/2 < (parentY1) + gap) { //Box cannot go futher than parentBox + margin on left side
                    newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, absoluteCoords.x,
                        (parentY1) + gap + selectedBox.bbox.h/2, cy);
                    selectedBox.bbox.y = newRelativeCoords.y;
                }
                else if (absoluteCoords.y + selectedBox.bbox.h/2 > (parentY2) - gap) { //Box cannot go futher than parentBox - margin on right side
                    newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, absoluteCoords.x,
                        (parentY2) - gap - selectedBox.bbox.h/2, cy);
                    selectedBox.bbox.y = newRelativeCoords.y;
                }
                else { //Else it is already relative
                    selectedBox.bbox.y = box_new_y;
                }

                absoluteCoords = instance.classes.AuxiliaryUnit.convertToAbsoluteCoord(selectedBox, selectedBox.bbox.x, selectedBox.bbox.y, cy);
                //Set anchor side changes
                if (absoluteCoords.y  === (parentY1) + gap + selectedBox.bbox.h / 2) { //If it is on the top margin allow it to change anchor sides
                    //If it is in the top and mouse moves bottom it can go left anchor
                    if (last_mouse_x < drag_x  && anchorSide === "left") {
                        selectedBox.anchorSide = "top"; //Set new anchor side
                        newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, (parentX1)
                            + instance.classes.AuxUnitLayout.getCurrentTopGap(), (parentY1), cy);
                        selectedBox.bbox.x = newRelativeCoords.x;
                        selectedBox.bbox.y = newRelativeCoords.y;
                    }
                    else if (last_mouse_x > drag_x && anchorSide === "right") { //If it is in the right and mouse moves up it can go top anchor side
                        selectedBox.anchorSide = "top"; //Set new anchor side
                        newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, (parentX2)
                            - instance.classes.AuxUnitLayout.getCurrentTopGap(), (parentY1), cy);
                        selectedBox.bbox.x = newRelativeCoords.x;
                        selectedBox.bbox.y = newRelativeCoords.y;
                    }
                }
                //If it on right it can pass right anchor side
                else if (absoluteCoords.y === (parentY2) - gap - selectedBox.bbox.h/2) {
                    if (last_mouse_x < drag_x && anchorSide === "left") {
                        selectedBox.anchorSide = "bottom"; //Set new anchor side
                        newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, (parentX1)
                            + instance.classes.AuxUnitLayout.getCurrentBottomGap(), (parentY2), cy);
                        selectedBox.bbox.x = newRelativeCoords.x;
                        selectedBox.bbox.y = newRelativeCoords.y;
                    }
                    else if (last_mouse_x > drag_x && anchorSide === "right") { //If it is in the bottom and mouse moves up it can go left anchor side
                        selectedBox.anchorSide = "bottom"; //Set new anchor side
                        newRelativeCoords = instance.classes.AuxiliaryUnit.convertToRelativeCoord(selectedBox, (parentX2)
                            - instance.classes.AuxUnitLayout.getCurrentBottomGap(), (parentY2), cy);
                        selectedBox.bbox.x = newRelativeCoords.x;
                        selectedBox.bbox.y = newRelativeCoords.y;
                    }
                }

            }

            last_mouse_x = drag_x;
            last_mouse_y = drag_y;
            cy.style().update();
        });

        cy.on("mouseup", function(event){
            appUtilities.disableInfoBoxRelocationDrag();
            if (selectedBox !== undefined && oldAnchorSide !== undefined) {
                selectedBox.dashed = false;
                instance.classes.AuxUnitLayout.modifyUnits(node, selectedBox, oldAnchorSide, cy); //Modify aux unit layouts
                selectedBox = undefined;
                anchorSide = undefined;
                oldAnchorSide = undefined;
                cy.autolock(false);
            }
        });

    });
}

//Disables info-box relocation
appUtilities.disableInfoBoxRelocation = function(color){
    var cy = this.getActiveCy();
    if (appUtilities.RelocationHandler !== undefined) {
        //Remove listerners
        cy.off('mousedown', appUtilities.RelocationHandler);
        appUtilities.disableInfoBoxRelocationDrag();
        if (relocatedNode !== undefined) {
            relocatedNode.data("border-color", color);
            relocatedNode = undefined;
        }
        relocatedNode = undefined;
        appUtilities.RelocationHandler = undefined;
        cy.autolock(false); //Make the nodes moveable again
        cy.autounselectify(false); //Make the nodes selectable
    }

};

//Disables info-box dragging
appUtilities.disableInfoBoxRelocationDrag = function(){
    if (appUtilities.relocationDragHandler !== undefined) {
        var cy = this.getActiveCy();
        //Remove listerners
        cy.off('mousemove', appUtilities.relocationDragHandler);
        appUtilities.relocationDragHandler = undefined;
    }
};

appUtilities.resizeNodesToContent = function(collection){

    var chiseInstance = appUtilities.getActiveChiseInstance();
    var cy = appUtilities.getActiveCy();

    var actions = [];
    collection.forEach(function( node ){
        var bbox = node.data('bbox');
        bbox.w = calculateWidth(node);
        bbox.h = calculateHeight(node);

        chiseInstance.classes.AuxUnitLayout.fitUnits(node);
        chiseInstance.resizeNodesToContent(node, bbox, actions);
    });

    cy.undoRedo().do("batch", actions);
    cy.style().update();
    cy.nodeResize('get').refreshGrapples();

    function calculateWidth(cyTarget) {
        // Label width calculation
        var labelText = cyTarget._private.style.label.value;
        var labelFontSize = cyTarget._private.style['font-size'].value * 80/100;
        var labelWidth = labelText.length * labelFontSize * 80/100;
        var labelWidth = (labelWidth === 0) ? 15 : labelWidth;

        // Separation of info boxes based on their locations
        var statesandinfos = cyTarget._private.data.statesandinfos;
        var bottomInfoBoxes = statesandinfos.filter(box => box.anchorSide === "bottom");
        var topInfoBoxes = statesandinfos.filter(box => box.anchorSide === "top");
        var leftInfoBoxes = statesandinfos.filter(box => box.anchorSide === "left");
        var rightInfoBoxes = statesandinfos.filter(box => box.anchorSide === "right");

        var horizontalMargin = 10;

        var bottomWidth = horizontalMargin;
        var topWidth = horizontalMargin;
        var middleWidth = 0;
        var leftWidth = 0;
        var rightWidth = 0;

        bottomInfoBoxes.forEach(function (infoBox) {
            bottomWidth += infoBox.bbox.w;
        });

        topInfoBoxes.forEach(function (infoBox) {
            topWidth += infoBox.bbox.w;
        });

        leftInfoBoxes.forEach(function (infoBox) {
            leftWidth = (leftWidth > infoBox.bbox.w/2) ? leftWidth : infoBox.bbox.w/2;
        });

        rightInfoBoxes.forEach(function (infoBox) {
            rightWidth = (rightWidth > infoBox.bbox.w/2) ? rightWidth : infoBox.bbox.w/2;
        });

        middleWidth = labelWidth + leftWidth + rightWidth + 3*horizontalMargin;
        var width = Math.max(bottomWidth, topWidth, labelWidth);
        return width + 2*horizontalMargin;
    }

    function calculateHeight(cyTarget) {
        var defaultHeight = 30;
        var infoBoxHeight = 0;
        var margin = 10;

        var statesandinfos = cyTarget._private.data.statesandinfos;
        var leftInfoBoxes = statesandinfos.filter(box => box.anchorSide === "left");
        var rightInfoBoxes = statesandinfos.filter(box => box.anchorSide === "right");

        var leftHeight = 2*margin;
        var rightHeight = 2*margin;
        leftInfoBoxes.forEach(function (infoBox) {
            leftHeight += infoBox.bbox.h;
        });

        rightInfoBoxes.forEach(function (infoBox) {
            rightHeight += infoBox.bbox.h;
        });

        var height = Math.max(leftHeight, rightHeight, defaultHeight);
        return height;
    }
};

module.exports = appUtilities;
