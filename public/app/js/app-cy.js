var jQuery = $ = require('jQuery');
var appUtilities = require('./app-utilities');
var bioGeneQtip = require('./biogene-qtip');
var modeHandler = require('./app-mode-handler');
var inspectorUtilities = require('./inspector-utilities');

module.exports = function () {
  var getExpandCollapseOptions = appUtilities.getExpandCollapseOptions.bind(appUtilities);
  var nodeQtipFunction = appUtilities.nodeQtipFunction.bind(appUtilities);
  var refreshUndoRedoButtonsStatus = appUtilities.refreshUndoRedoButtonsStatus.bind(appUtilities);

  $(document).ready(function ()
  {
    appUtilities.sbgnNetworkContainer = $('#sbgn-network-container');
    // register extensions and bind events when cy is ready
    cy.ready(function () {
      cytoscapeExtensionsAndContextMenu();
      bindCyEvents();
    });
  });
  
  function cytoscapeExtensionsAndContextMenu() {
    cy.expandCollapse(getExpandCollapseOptions());

    var contextMenus = cy.contextMenus({
    });
    
    cy.autopanOnDrag();

    cy.edgeBendEditing({
      // this function specifies the positions of bend points
      bendPositionsFunction: function (ele) {
        return ele.data('bendPointPositions');
      },
      // whether the bend editing operations are undoable (requires cytoscape-undo-redo.js)
      undoable: true,
      // title of remove bend point menu item
      removeBendMenuItemTitle: "Delete Bend Point",
      // whether to initilize bend points on creation of this extension automatically
      initBendPointsAutomatically: false
    });

    contextMenus.appendMenuItems([
      {
        id: 'ctx-menu-general-properties',
        title: 'Properties...',
        coreAsWell: true,
        onClickFunction: function (event) {
          $("#general-properties").trigger("click");
        }
      },
      {
        id: 'ctx-menu-delete',
        title: 'Delete',
        selector: 'node, edge',
        onClickFunction: function (event) {
          cy.undoRedo().do("deleteElesSimple", {
            eles: event.cyTarget
          });
        }
      },
      {
        id: 'ctx-menu-delete-selected',
        title: 'Delete Selected',
        onClickFunction: function () {
          $("#delete-selected-simple").trigger('click');
        },
        coreAsWell: true // Whether core instance have this item on cxttap
      },
      {
        id: 'ctx-menu-hide-selected',
        title: 'Hide Selected',
        onClickFunction: function () {
          $("#hide-selected").trigger('click');
        },
        coreAsWell: true // Whether core instance have this item on cxttap
      },
      {
        id: 'ctx-menu-show-all',
        title: 'Show All',
        onClickFunction: function () {
          $("#show-all").trigger('click');
        },
        coreAsWell: true // Whether core instance have this item on cxttap
      },
      {
        id: 'ctx-menu-expand', // ID of menu item
        title: 'Expand', // Title of menu item
        // Filters the elements to have this menu item on cxttap
        // If the selector is not truthy no elements will have this menu item on cxttap
        selector: 'node.cy-expand-collapse-collapsed-node',
        onClickFunction: function (event) { // The function to be executed on click
          cy.undoRedo().do("expand", {
            nodes: event.cyTarget
          });
        }
      },
      {
        id: 'ctx-menu-collapse',
        title: 'Collapse',
        selector: 'node:parent',
        onClickFunction: function (event) {
          cy.undoRedo().do("collapse", {
            nodes: event.cyTarget
          });
        }
      },
      {
        id: 'ctx-menu-perform-layout',
        title: 'Perform Layout',
        onClickFunction: function () {
          $("#perform-layout").trigger('click');
        },
        coreAsWell: true // Whether core instance have this item on cxttap
      },
      {
        id: 'ctx-menu-biogene-properties',
        title: 'BioGene Properties',
        selector: 'node[class="macromolecule"],[class="nucleic acid feature"],[class="unspecified entity"]',
        onClickFunction: function (event) {
          bioGeneQtip(event.cyTarget);
        }
      }
    ]);

    cy.clipboard({
      clipboardSize: 5, // Size of clipboard. 0 means unlimited. If size is exceeded, first added item in clipboard will be removed.
      shortcuts: {
        enabled: true, // Whether keyboard shortcuts are enabled
        undoable: true // and if undoRedo extension exists
      }
    });

    cy.viewUtilities({
      node: {
        highlighted: {
          'border-width': '10px'
        }, // styles for when nodes are highlighted.
        unhighlighted: {// styles for when nodes are unhighlighted.
          'opacity': function (ele) {
            return ele.css('opacity');
          }
        }
      },
      edge: {
        highlighted: {
          'width': '10px'
        }, // styles for when edges are highlighted.
        unhighlighted: {// styles for when edges are unhighlighted.
          'opacity': function (ele) {
            return ele.css('opacity');
          }
        }
      }
    });
    
    cy.nodeResize({
      padding: 2, // spacing between node and grapples/rectangle
      undoable: true, // and if cy.undoRedo exists

      grappleSize: 7, // size of square dots
      grappleColor: "#d67614", // color of grapples
      inactiveGrappleStroke: "inside 1px #d67614",
      boundingRectangle: true, // enable/disable bounding rectangle
      boundingRectangleLineDash: [1.5, 1.5], // line dash of bounding rectangle
      boundingRectangleLineColor: "darkgray",
      boundingRectangleLineWidth: 1.5,
      zIndex: 999,
      minWidth: function (node) {
        var data = node.data("resizeMinWidth");
        return data ? data : 10;
      }, // a function returns min width of node
      minHeight: function (node) {
        var data = node.data("resizeMinHeight");
        return data ? data : 10;
      }, // a function returns min height of node

      isFixedAspectRatioResizeMode: function (node) {
        var sbgnclass = node.data("class");
        return chise.elementUtilities.mustBeSquare(sbgnclass);
      }, // with only 4 active grapples (at corners)
      isNoResizeMode: function (node) {
        return node.is(".noResizeMode, :parent")
      }, // no active grapples

      cursors: {// See http://www.w3schools.com/cssref/tryit.asp?filename=trycss_cursor
        // May take any "cursor" css property
        default: "default", // to be set after resizing finished or mouseleave
        inactive: "not-allowed",
        nw: "nw-resize",
        n: "n-resize",
        ne: "ne-resize",
        e: "e-resize",
        se: "se-resize",
        s: "s-resize",
        sw: "sw-resize",
        w: "w-resize"
      }
    });
    
    //For adding edges interactively
    cy.edgehandles({
      // fired when edgehandles is done and entities are added
      complete: function (sourceNode, targetNodes, addedEntities) {
        if (!targetNodes) {
          return;
        }
        
        // We need to remove interactively added entities because we should add the edge with the chise api
        addedEntities.remove();
        
        // fired when edgehandles is done and entities are added
        var param = {};
        var source = sourceNode.id();
        var target = targetNodes[0].id();
        var edgeclass = modeHandler.elementsHTMLNameToName[modeHandler.selectedEdgeType];

        chise.addEdge(source, target, edgeclass);
        
        // If not in sustain mode set selection mode
        if (!modeHandler.sustainMode) {
          modeHandler.setSelectionMode();
        }

        cy.edges()[cy.edges().length - 1].select();
      },
      loopAllowed: function( node ) {
        // for the specified node, return whether edges from itself to itself are allowed
        return false;
      },
      toggleOffOnLeave: true, // whether an edge is cancelled by leaving a node (true), or whether you need to go over again to cancel (false; allows multiple edges in one pass)
      handleSize: 0 // the size of the edge handle put on nodes (Note that it is 0 because we do not want to see the handle)
    });

    cy.edgehandles('drawoff');
    
    var gridProperties = appUtilities.currentGridProperties;
    
    cy.gridGuide({
      drawGrid: gridProperties.showGrid,
      snapToGrid: gridProperties.snapToGrid,
      discreteDrag: gridProperties.discreteDrag,
      gridSpacing: gridProperties.gridSize,
      resize: gridProperties.autoResizeNodes,
      guidelines: gridProperties.showAlignmentGuidelines,
      guidelinesTolerance: gridProperties.guidelineTolerance,
      guidelinesStyle: {
        strokeStyle: gridProperties.guidelineColor
      }
    });

    var panProps = ({
      fitPadding: 10,
      fitSelector: ':visible',
      animateOnFit: function () {
        return appUtilities.currentGeneralProperties.animateOnDrawingChanges;
      },
      animateOnZoom: function () {
        return appUtilities.currentGeneralProperties.animateOnDrawingChanges;
      }
    });

    appUtilities.sbgnNetworkContainer.cytoscapePanzoom(panProps);
  }

  function bindCyEvents() {
    cy.on("afterDo", function (actionName, args) {
      refreshUndoRedoButtonsStatus();
    });

    cy.on("afterUndo", function (actionName, args) {
      refreshUndoRedoButtonsStatus();
      cy.style().update();
    });

    cy.on("afterRedo", function (actionName, args) {
      refreshUndoRedoButtonsStatus();
      cy.style().update();
    });
    
    cy.on("mousedown", "node", function (event) {
      var self = this;
      if (modeHandler.mode == 'selection-mode' && appUtilities.ctrlKeyDown) {
        appUtilities.enableDragAndDropMode();
        appUtilities.nodesToDragAndDrop = self.union(cy.nodes(':selected'));
        appUtilities.dragAndDropStartPosition = event.cyPosition;
      }
    });
    
    cy.on("mouseup", function (event) {
      var self = event.cyTarget;
      if (appUtilities.dragAndDropModeEnabled) {
        var newParent;
        if (self != cy) {
          newParent = self;

          if (newParent.data("class") != "complex" && newParent.data("class") != "compartment") {
            newParent = newParent.parent()[0];
          }
        }
        var nodes = appUtilities.nodesToDragAndDrop;

        appUtilities.disableDragAndDropMode();

        chise.changeParent(nodes, newParent, event.cyPosition.x - appUtilities.dragAndDropStartPosition.x, 
                              event.cyPosition.y - appUtilities.dragAndDropStartPosition.y);

        appUtilities.dragAndDropStartPosition = null;
        appUtilities.nodesToDragAndDrop = null;
      }
    });

    cy.on('mouseover', 'node', function (event) {
      var node = this;

      $(".qtip").remove();

      if (event.originalEvent.shiftKey)
        return;

      node.qtipTimeOutFcn = setTimeout(function () {
        nodeQtipFunction(node);
      }, 1000);
    });

    cy.on('mouseout', 'node', function (event) {
      if (this.qtipTimeOutFcn != null) {
        clearTimeout(this.qtipTimeOutFcn);
        this.qtipTimeOutFcn = null;
      }
    });

    cy.on('tap', function (event) {
      $('input').blur();
      
      // If add node mode is active create a node on tap
      if (modeHandler.mode == "add-node-mode") {
        var cyPosX = event.cyPosition.x;
        var cyPosY = event.cyPosition.y;
        var sbgnclass = modeHandler.elementsHTMLNameToName[modeHandler.selectedNodeType];

        chise.addNode(cyPosX, cyPosY, sbgnclass);
        
        // If not in sustainable mode set selection mode
        if (!modeHandler.sustainMode) {
          modeHandler.setSelectionMode();
        }

        cy.nodes()[cy.nodes().length - 1].select();
      }
    });

    cy.on('tap', 'node', function (event) {
      var node = this;

      $(".qtip").remove();

      if (event.originalEvent.shiftKey)
        return;

      if (node.qtipTimeOutFcn != null) {
        clearTimeout(node.qtipTimeOutFcn);
        node.qtipTimeOutFcn = null;
      }

      nodeQtipFunction(node);
    });
    
    // TODO see the effects of these on performance
    cy.on('select', function() {
      inspectorUtilities.handleSBGNInspector();
    });
    
    cy.on('unselect', function() {
      inspectorUtilities.handleSBGNInspector();
    });
    
    cy.on('add', function(event) {
      // When the graph is being updated we should not set the elements data
      // We postpone it to 'updateGraphEnd' event
      if (appUtilities.updatingGraph) {
        return;
      }
      var ele = event.cyTarget;
      appUtilities.setElementsData(ele);
    });
  }
};