jQuery.sap.require("nw.epm.refapps.ext.po.apv.util.approver");

sap.ui.core.mvc.Controller.extend("nw.epm.refapps.ext.po.apv.view.S3_PurchaseOrderDetails", {

	_sContextPath: null, // context path of the PO currently displayed
	// The following attributes are only used while an approval/rejection dialog is running. Note that it is necessary
	// to keep this state in instance variables of the controller, since the process is asynchronous.                                 
	_bApprove: false, // Indicates whether the PO to be processed is to be approved or rejected
	_sPOId: null, // ID of the PO being processed	
	_sSupplier: null, // Name of the supplier of the PO being processed
	// The following attributes are used to provide easy access to some global resources. They are 'more or less constant' because they are
	// initialized in onInit and not changed afterwards.
	_oView: null, // This view
	_oEventBus: null, // 'Local' event bus of the component. Used for communication between views.
	_oItemTable: null, // Table displaying the PO items
	_oItemTemplate: null, // Template for line of the table of purchase order items. Used for rebinding the item.
	_oViewProperties: null, // json model for binding derived information to the view
	_oApprovalDialog: null, // Confirmation dialog for approve/reject. Initialized on demand.
	_oShareDialog: null, // Share dialog. Initialized on demand.

	onInit: function() {
		// Initialize the attributes
		this._oView = this.getView();
		this._oEventBus = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this._oView)).getEventBus();
		this._oItemTable = this.byId("PurchaseOrderItems");
		this._oItemTemplate = this.byId("POItemList").clone();
		// Register for routes
		sap.ui.core.UIComponent.getRouterFor(this).attachRouteMatched(this.onRoutePatternMatched, this);
		this._initViewPropertiesModel();
	},

	// The model created here is used to set values or view element properties that cannot be bound
	// directly to the OData service. Setting view element attributes by binding them to a model is preferable to the
	// alternative of getting each view element by its ID and setting the values directly because a JSon model is more
	// robust if the customer removes view elements (see extensibility).
	_initViewPropertiesModel: function() {
		this._oViewProperties = new sap.ui.model.json.JSONModel();
		this._oView.setModel(this._oViewProperties, "viewProperties");
	},

	// This method is registered with the router in onInit. Therefore, it is called whenever the URL is changed.
	// Note that there are two possible reasons for such a change:
	// - The user has entered a URL manually (or using browser facilities, such as a favorite)
	// - Navigation to a route was triggered programmatically
	onRoutePatternMatched: function(oEvent) {
		if (oEvent.getParameter("name") !== "PurchaseOrderDetails") {
			return; // no need to take action on "master" route
		}
		var sPOId = decodeURIComponent(oEvent.getParameter("arguments").POId);
		var sPath = "/PurchaseOrders('" + sPOId + "')";
		if (this._sContextPath === sPath) {
			return;
		}
		// If PO has changed refresh context path for view and binding for table of PO items
		// Note that we rely on the fact that all attributes displayed in the object header have already
		// been retrieved with the select defined for the master list. 
		this._sContextPath = sPath;
		this._oView.bindElement({
			path: this._sContextPath,
			parameters: {
				select: "POId,OrderedByName,SupplierName,GrossAmount,CurrencyCode,ChangedAt,DeliveryDateEarliest,LaterDelivDateExist,DeliveryAddress,ItemCount"
			}
		});
		var _sPOItemsPath = this._sContextPath + "/PurchaseOrderItems";
		var oResourceBundle = this._oView.getModel("i18n").getResourceBundle();
		this._oViewProperties.setProperty("/itemTableHeader", oResourceBundle.getText("xtit.itemListTitle"));
		this._oItemTable.bindItems({
			path: _sPOItemsPath,
			template: this._oItemTemplate,
			parameters: {
				select: "POId,POItemPos,Product,Price,PriceCurrency,GrossAmount,GrossAmountCurrency,Quantity,DeliveryDate"
			}
		});
	},

	// Event handler for the table of PO items that is attached declaratively
	onItemsTableUpdateFinished: function(oEvent) {
		this._setPOItemsTableTitle(oEvent.getParameter("total"));
	},

	// Update the title of the table of PO items. iTotal is the number of items displayed in this table.
	_setPOItemsTableTitle: function(iTotal) {
		var oResourceBundle = this._oView.getModel("i18n").getResourceBundle();
		this._oViewProperties.setProperty("/itemTableHeader", oResourceBundle.getText("xtit.itemListTitleWithCount", [iTotal]));
	},

	// Event handler for buttons 'Approve' and 'Reject' that is attached declaratively
	onOpenApprovalDialog: function(oEvent) {
		if (!this._oApprovalDialog) {
			this._initializeApprovalDialog();
		}
		var oResourceBundle = this._oView.getModel("i18n").getResourceBundle();
		var oModel = this._oView.getModel();
		this._sSupplier = oModel.getProperty(this._sContextPath).SupplierName;
		this._sPOId = oModel.getProperty(this._sContextPath).POId;
		this._bApprove = (oEvent.getSource().getType() === "Accept");
		var sApprovalText = oResourceBundle.getText(this._bApprove ? "xfld.approvalTextWithSupplier" : "xfld.rejectionTextWithSupplier", [this._sSupplier]);
		var sTitle = oResourceBundle.getText(this._bApprove ? "xtit.approvalTitleForDialog" : "xtit.rejectionTitleForDialog");
		this._oViewProperties.setProperty("/approvalText", sApprovalText);
		this._oViewProperties.setProperty("/approvalTitle", sTitle);
		this._oViewProperties.setProperty("/approvalNote", "");
		this._oApprovalDialog.open();
	},

	// Initialization of the approval dialog. This method will only be called once.
	_initializeApprovalDialog: function() {
		this._oApprovalDialog = sap.ui.xmlfragment("nw.epm.refapps.ext.po.apv.view.fragment.ApprovalDialog", this);
		// Switch the dialog to compact mode if the hosting view is in compact mode
		jQuery.sap.syncStyleClass("sapUiSizeCompact", this._oView, this._oApprovalDialog);
		this._oView.addDependent(this._oApprovalDialog);
	},

	// Event handler for the confirm action of the approval dialog. Note that this event handler is attached declaratively
	// in the definition of fragment nw.epm.refapps.ext.po.apv.view.fragment.ApprovalDialog.
	onConfirmAction: function() {
		var sApprovalNote = this._oViewProperties.getProperty("/approvalNote"); // retrieve user input in the notes field
		// The approval action itself is delegated to a utility function. Note that this function is also responsible for closing the confirmation dialog.              
		nw.epm.refapps.ext.po.apv.util.approver.approve(this._bApprove, this._oView, this._sPOId, this._sSupplier, sApprovalNote, jQuery.proxy(
			this.onApprovalSuccess, this), this._oApprovalDialog);
	},

	// This event handler is called when an approve/reject action has been performed successfully.
	onApprovalSuccess: function() {
		// Broadcast the information about the successfull approve/reject action. Actually, only master view is lietening.
		this._oEventBus.publish("nw.epm.refapps.po.apv", "onApprovalExecuted");
		if (sap.ui.Device.system.phone) { // When the app is being used on a phone) leave detail screen and go back to master
			sap.ui.core.UIComponent.getRouterFor(this).navTo("PurchaseOrders", true);
		}
	},

	// Event handler for the cancel action of the approval dialog. Note that this event handler is attached declaratively
	// in the definition of fragment nw.epm.refapps.ext.po.apv.view.fragment.ApprovalDialog.
	onCancelAction: function() {
		this._oApprovalDialog.close();
	},

	// This handler opens the Jam/Share dialog with an Acrions sheet containing the standard "AddBookmark" button
	onSharePressed: function(oEvent) {
		var oShareButton = oEvent.getSource();
		var oBtnAddBookmark = null;
		var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
		if (!this._oShareDialog) {

			this._oShareDialog = sap.ui.xmlfragment("nw.epm.refapps.ext.po.apv.view.fragment.ShareSheet", this);
			// Switch the dialog to compact mode if the hosting view has compact mode
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this._oView, this._oShareDialog);
			this.getView().addDependent(this._oShareDialog);

			oBtnAddBookmark = sap.ui.getCore().byId("btnAddBookmark", this._oShareDialog.getId());
			oBtnAddBookmark.setAppData({
				url: document.URL,
				title: oResourceBundle.getText("xtit.saveAsTile")
			});
		}
		this._oShareDialog.openBy(oShareButton);
	},

	// Handler for the navigation button (only available when the app is being used on a phone) that is attached declaratively.                                 
	onNavButtonPress: function() {
		sap.ui.core.UIComponent.getRouterFor(this).navTo("PurchaseOrders", true); // return to master page
	}
});