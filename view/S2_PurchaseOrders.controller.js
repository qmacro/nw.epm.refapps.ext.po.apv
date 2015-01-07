jQuery.sap.require("nw.epm.refapps.ext.po.apv.util.formatter");

sap.ui.core.mvc.Controller.extend("nw.epm.refapps.ext.po.apv.view.S2_PurchaseOrders", {

	_oView: null, // this view. This attribute is initialized in onInit and never changed afterwards.
	_oList: null, // the master list. This attribute is initialized in onInit and never changed afterwards.                                 
	_sPreselectedContextPath: null, // Context path of a list item that should be preselected.
	// If this attribute is faulty or the specified PO is not in the list, the first PO in the list will be preseletced

	// binding of the master list. Is initialized when the view is rendered the first time and never changed afterwards.
	_oListBinding: null,
	_oEmptyPage: null, //  detail view in case no PO exists (more precisely, no PO matches the filter criteria). Initialized on demand.                                 
	_bHasMetadataError: false, // set to true as soon as metadata call of then oData model fails. Reset when metadata are read successfully.
	                           // Note that user can trigger a retry of reading metadata by pressing refresh or search in the search field.
	_sCurrentSearchTerm: "", // the search term that is currently used to filter the result list
	_bFirstCall: true, // is set to false when the first PO is displayed on the detail screen

	onInit: function() {
	    this._oView = this.getView();
		this._oList = this.byId("list"); // initialize
		var oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this._oView));
		// Subscribe to event that is triggered by other screens when a PO was approved or rejected
		var oEventBus = oComponent.getEventBus();
		oEventBus.subscribe("nw.epm.refapps.po.apv", "onApprovalExecuted", function() {
			this.onApprovalExecuted("");
		}, this);
		// Register for error events on the oData model
		var oModel = oComponent.getModel();
		oModel.attachRequestFailed(this.onRequestFailed);
		oModel.attachMetadataFailed(this.onMetadataRequestFailed, this);
		// Register for routes
		sap.ui.core.UIComponent.getRouterFor(this).attachRouteMatched(this.onRoutePatternMatched, this);
	},

	// This method is registered with the router in onInit. Therefore, it is called whenever the URL is changed.
	// Note that there are two possible reasons for such a change:
	// - The user has entered a URL manually (or using browser facilities, such as a favorite)
	// - Navigation to a route was triggered programmatically
	onRoutePatternMatched: function(oEvent) {
		if (oEvent.getParameter("name") !== "PurchaseOrderDetails") {
			return; // no need to take action on "master" route
		}
		// Route "PurchaseOrderDetails" contains the specification of the PO to be selected
		var sPOId = decodeURIComponent(oEvent.getParameter("arguments").POId);
		this._sPreselectedContextPath = "/PurchaseOrders('" + sPOId + "')";
	},

	// Initialize attribute _oListBinding just before the view is rendered the first time.
	// Note that this initialization cannot be performed in onInit, because the list binding is not accessible
	// at this point in time due to UI5 performance optimizations.
	onBeforeRendering: function() {
		if (!this._oListBinding) {
			this._oListBinding = this._oList.getBinding("items");
		}
	},

	// Event handler for the search field in the master list. It is attached declaratively.
	// Note that this handler listens to the search button and to the refresh button in the search field
	onSearch: function(oEvent) {
		var oSearchField = oEvent.getSource();
		// First handle case that refresh button was pressed. In this case the last search should be repeated.
		if (oEvent.getParameter("refreshButtonPressed")) {
			oSearchField.setValue(this._sCurrentSearchTerm); // replace content of search field with last search
			this._listRefresh(); // and refresh the search
			return;
		}
		// Now handle the case that the search button was pressed.
		var sCurrentSearchTerm = oSearchField.getValue(); // content of the search field
		// If the content of the search field has not changed, simply perform a refresh
		if (sCurrentSearchTerm === this._sCurrentSearchTerm) {
			this._listRefresh();
			return;
		}
		this._sCurrentSearchTerm = sCurrentSearchTerm;
		if (this._bHasMetadataError) {
			this._oView.getModel().refreshMetadata(); // If metadata load ended with error, try to read metadata once more now  
		} else {
			this._searchImpl();
		}
	},

	// Execute search with the filter defined by this._sCurrentSearchTerm	
	_searchImpl: function() {
		// Search is implemented using setting filter(s) on the binding of the master list.
		// More precisely, either 0 (empty search string) or 1 filter is applied to the binding.
		var aFilters = []; // list of filters to be applied
		if (this._sCurrentSearchTerm) {
			var oFilter = new sap.ui.model.Filter("SupplierName", sap.ui.model.FilterOperator.Contains, this._sCurrentSearchTerm);
			aFilters.push(oFilter);
		}
		// Set filters on list. Note that this replaces existing filters.
		this._oListBinding.filter(aFilters, sap.ui.model.FilterType.Application);
	},

	// Event handler for the pullToRefresh-element of the list. It is attached declaratively.
	onPullToRefresh: function(oEvent) {
		var oPullToRefresh = oEvent.getSource();
		// Hide the pull to refresh when data has been loaded
		this._oList.attachEventOnce("updateFinished", function() {
			// Note: Do not use oEvent here, because UI5 might have reinitialized this instance already (instance pooling for performance reasons)
			oPullToRefresh.hide();
		});
		// Refresh list from backend
		this._listRefresh();
	},

	// Event handler for the case that the user selects one item in the master list.
	// Note: This method is referred twice in the declarative definition of this view.
	// The first reference is event 'selectionChange' of the master list; the second one is 'press' on the list item.
	// The second reference is needed in case the list mode is 'None' (which is true on phone).                                 
	onItemSelect: function(oEvent) {
		// Determine the list item that was selected. Note that the techique to retrieve this from the event depends
		// on the list mode (in other words, the event we are currently listening to).
		var oListItem = this._oList.getMode() === "None" ? oEvent.getSource() : oEvent.getParameter("listItem");
		// and navigate to the item
		this._navToListItem(oListItem);
		// Note: The following statement only applies when tablet device is in portrait mode. In this case master should be hidden after each selection.
		this._oView.getParent().getParent().hideMaster();
	},

	// This method triggers the navigation to the detail page with the specified list item oListItem
	_navToListItem: function(oListItem) {
		var oCtx = oListItem.getBindingContext();
		sap.ui.core.UIComponent.getRouterFor(this).navTo("PurchaseOrderDetails", {
			POId: encodeURIComponent(oCtx.getProperty("POId"))
		}, true);
	},

	// Event handler for the master list. It is attached declaratively.
	onUpdateFinished: function() {
		// Change count in title when list is updated
		var oResourceBundle = this._oView.getModel("i18n").getResourceBundle(),
			iPOCount = this._oListBinding.getLength(),
			sCount = isNaN(iPOCount) ? "" : "(" + iPOCount + ")",
			sTitle = oResourceBundle.getText("xtit.masterTitle", [sCount]);
		this.byId("masterPage").setTitle(sTitle);
		// If not on the phone, make sure that a PO is selected (if available)
		if (!sap.ui.Device.system.phone) {
			this._setItem();
		}
	},

	// This method ensures that a PO is selected. This is either the PO specified by attribute _sPreselectedContextPath
	// or the first PO in the master list.
	_setItem: function() {
		var aItems = this._oList.getItems();
		if (aItems.length > 0) { // If there are POs in the list, display one
			var oItemToSelect = aItems[0]; // Fallback: Display the first PO in the list
			// But if another PO is required: Try to select this one
			if (this._sPreselectedContextPath) {
				for (var i = 0; i < aItems.length; i++) {
					var oItem = aItems[i];
					if (oItem.getBindingContext().getPath() === this._sPreselectedContextPath) {
						oItemToSelect = oItem;
						break;
					}
				}
			}
			// Now we know which item to select
			this._oList.setSelectedItem(oItemToSelect); // Mark it as selected in the master list
			// When the App is started the scroll position should be set to the item to be selected.
			// Note that this is only relevant when the App has been started with a route specifying the
			// PO to be displayed, because otheriwse the first PO in the list will be the selected one anyway.
			if (this._bFirstCall) {
				this._bFirstCall = false;
				oItemToSelect.getDomRef().scrollIntoView();
			}
			this._navToListItem(oItemToSelect); // and display the item on the detail page
		} else {
			// If no PO is available, we display the empty screen on the detail page.
			// The empty screen does not need to be accessible via URL, therefore there is no route for it.
			// Therefore, we use UI5 low-level api for navigating to the empty view.
			var oSplitApp = this._oView.getParent().getParent();
			if (!this._oEmptyPage) {
				this._oEmptyPage = sap.ui.view({
					viewName: "nw.epm.refapps.ext.po.apv.view.EmptyPage",
					type: sap.ui.core.mvc.ViewType.XML
				});
				oSplitApp.addDetailPage(this._oEmptyPage);
			}
			oSplitApp.toDetail(this._oEmptyPage);
			// Set back the route to the generic one
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("PurchaseOrders");
		}
	},

	// Handler for the nav button of the page. It is attached declaratively.
	onNavButtonPress: function() {
		window.history.go(-1); // behave like browser back button
	},

	// This method is called when an approve/reject action was successfully executed.
	// This is caused by one of the following two alternatives:
	// - User has used an Approve/Reject button on the detail page
	// - User has used swipe action on the master list
	// As the approved/rejected PO will be removed from the list, the list needs to be refreshed.                                 
	// Moreover (when the app is not being used on a phone), the PO selection needs to be updated if the removed PO was the selected one. 
	// This is always the case for the first alternative and might or might not be the case for the second alternative.
	// Parameter sPath is passed for the second reason to indicate the context path of the removed PO.
	// If the selected PO is indeed the removed one the selection should change to the next list entry
	// or to the previous one, when we are already at the end of the list.
	onApprovalExecuted: function(sPath) {
		if (!sap.ui.Device.system.phone) {
			var oSelectedItem = this._oList.getSelectedItem(),
				sCurrentPath = oSelectedItem && oSelectedItem.getBindingContext().getPath();
			// If sPath is given (that is, swipe case) the currently selected PO should stay selected if it is not the removed one 
			this._sPreselectedContextPath = sPath && sPath !== sCurrentPath && sCurrentPath;
			// Now, this._sPreselectedContextPath is truthy exactly when the current selection should not be changed.
			// Otherwise, the following loop is used to find the currently selected PO in the list of all items and identify the preferred neighbour.
			var aItems = this._oList.getItems();
			for (var i = 0; i < aItems.length && !this._sPreselectedContextPath; i++) {
				if (aItems[i].getBindingContext().getPath() === sCurrentPath) {
					var oNextItem = aItems[i === aItems.length - 1 ? (i - 1) : (i + 1)];
					this._sPreselectedContextPath = oNextItem && oNextItem.getBindingContext().getPath();
				}
			}
		}
		// Now (when the app is not being used on a phone) the PO which should be selected after the list update is specified in this._sPreselectedContextPath.
		// This will be evaluated by method _setItem after the list has been refreshed, which is triggered now.
		this._listRefresh();
	},

	// This method is called whenever a refresh is triggered.	
	_listRefresh: function() {
		// If metadata load has run into an error, this method can only be triggered by the user pressing the
		// refresh or search button in the search field.
		// In this case we take this action as a hint to retry to load the metadata.
		if (this._bHasMetadataError) {
			this._oView.getModel().refreshMetadata();
		} else { // metadata are ok. Thus, we refresh the list. Note that this (normally) leads to a call of onUpdateFinished.
			this._oListBinding.refresh();
		}
	},

	// Event handler for the swipe action of a list item. It is attached declaratively. 
	onSwipeApprove: function() {
		var oItem = this._oList.getSwipedItem(),
			oBindingContext = oItem.getBindingContext(),
			sPath = oBindingContext.getPath(),
			sPOId = oBindingContext.getProperty(sPath).POId,
			sSupplier = oBindingContext.getProperty(sPath).SupplierName;
		jQuery.sap.require("nw.epm.refapps.ext.po.apv.util.approver");
		nw.epm.refapps.ext.po.apv.util.approver.approve(true, this._oView, sPOId, sSupplier, "", jQuery.proxy(
			this.onApprovalExecuted, this, sPath));
	},

	// This handler is called when the metadata load for the oData model fails. It is attached in onInit.
	// When this happens for the first time, we register ourselves for a successfull load.
	onMetadataRequestFailed: function(oResponse) {
		if (!this._bHasMetadataError) { // first time
			this._bHasMetadataError = true;
			var oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this._oView)),
				oModel = oComponent.getModel();
			oModel.attachMetadataLoaded(this.onMetadataLoaded, this);
		}
		jQuery.sap.require("nw.epm.refapps.ext.po.apv.util.messages");
		nw.epm.refapps.ext.po.apv.util.messages.showErrorMessage(oResponse);
	},

	// Handler for the case that metadata are loaded successfully. It is attached in onMetadataRequestFailed.
	// Therefore, it is only called when the request has failed before. Note that a new retrieval of metadata
	// can be triggered by pressing the refresh or search button in the search field.
	onMetadataLoaded: function() {
		this._bHasMetadataError = false;
		this._searchImpl();
	},

	onRequestFailed: function(oResponse) {
		jQuery.sap.require("nw.epm.refapps.ext.po.apv.util.messages");
		nw.epm.refapps.ext.po.apv.util.messages.showErrorMessage(oResponse);
	}
});