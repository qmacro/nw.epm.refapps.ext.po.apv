jQuery.sap.declare("nw.epm.refapps.ext.po.apv.Component");
jQuery.sap.require("sap.m.routing.RouteMatchedHandler");

sap.ui.core.UIComponent.extend("nw.epm.refapps.ext.po.apv.Component", {
	metadata: {
		name: "Approve Purchase Order",
		version: "1.0",
		includes: ["css/approvePOStyle.css"],
		dependencies: {
			libs: ["sap.m", "sap.me", "sap.ushell"],
			components: []
		},

		config: {
			resourceBundle: "i18n/i18n.properties",
			titleResource: "xtit.shellTitle",
			icon: "sap-icon://Fiori7/F1373",
			favIcon: "icon/F1373_Approve_Purchase_Orders.ico",
			phone: "icon/launchicon/57_iPhone_Desktop_Launch.png",
			"phone@2": "icon/launchicon/114_iPhone-Retina_Web_Clip.png",
			tablet: "icon/launchicon/72_iPad_Desktop_Launch.png",
			"tablet@2": "icon/launchicon/144_iPad_Retina_Web_Clip.png",
			serviceConfig: {
				name: "EPM_REF_APPS_PO_APV_SRV",
				serviceUrl: "/sap/opu/odata/sap/EPM_REF_APPS_PO_APV_SRV/"
			}
		},

		routing: {
			config: {
				viewType: "XML",
				viewPath: "nw.epm.refapps.ext.po.apv.view", // common prefix
				targetAggregation: "detailPages",
				clearTarget: false
			},
			routes: [{
				pattern: "",
				name: "PurchaseOrders",
				view: "S2_PurchaseOrders",
				viewLevel: 0,
				targetAggregation: "masterPages",
				preservePageInSplitContainer: true,
				targetControl: "fioriContent",
				subroutes: [{
					pattern: "PurchaseOrder/{POId}",
					view: "S3_PurchaseOrderDetails",
					viewLevel: 1,
					name: "PurchaseOrderDetails" // name used for listening or navigating to this route
/*					}, {
					"pattern": ":all*:",
					"view": "EmptyPage" */
					}]
				}]
		}
	},

	init: function() {
		sap.ui.core.UIComponent.prototype.init.apply(this, arguments);

		var oServiceConfig = this.getMetadata().getConfig().serviceConfig;
		var sServiceUrl = oServiceConfig.serviceUrl;

		// always use absolute paths relative to our own component
		// (relative paths will fail if running in the Fiori Launchpad)
		var sRootPath = jQuery.sap.getModulePath("nw.epm.refapps.ext.po.apv");

		// set i18n model
		var oI18nModel = new sap.ui.model.resource.ResourceModel({
			bundleUrl: sRootPath + "/i18n/i18n.properties"
		});
		this.setModel(oI18nModel, "i18n");

		// set data model
		var oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, {
			json: true,
			defaultBindingMode: "OneWay",
			useBatch: true,
			defaultCountMode: "Inline",
			loadMetadataAsync: true
		});

		this.setModel(oModel);

		// The device model enables the views used in this application to access
		// the information about the current device in declarative view definition
		var oDeviceModel = new sap.ui.model.json.JSONModel({
			isDesktop: sap.ui.Device.system.desktop,
			isNoDesktop: !sap.ui.Device.system.desktop,
			isPhone: sap.ui.Device.system.phone,
			isNoPhone: !sap.ui.Device.system.phone,
			listMode: sap.ui.Device.system.phone ? "None" : "SingleSelectMaster",
			listItemType: sap.ui.Device.system.phone ? "Active" : "Inactive"
		});
		oDeviceModel.setDefaultBindingMode("OneWay");
		this.setModel(oDeviceModel, "device");
		
		var oRouter = this.getRouter();
		this._routeMatchedHandler = new sap.m.routing.RouteMatchedHandler(oRouter);
		// Router is initialized at the end, since this triggers the instantiation of the views.
		// In onInit of the views we want to rely on the component being correctly initialized.
		oRouter.initialize();
	},
	
    exit : function() {
        this._routeMatchedHandler.destroy();
    },

	// Initialize the application
	createContent: function() {

		var oViewData = {
			component: this
		};
		return sap.ui.view({
			viewName: "nw.epm.refapps.ext.po.apv.view.Main",
			type: sap.ui.core.mvc.ViewType.XML,
			viewData: oViewData
		});
	}
});