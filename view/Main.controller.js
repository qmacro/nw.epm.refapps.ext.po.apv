sap.ui.controller("nw.epm.refapps.ext.po.apv.view.Main", {

	onInit: function() {
		if (sap.ui.Device.system.desktop) {
			this.getView().addStyleClass("sapUiSizeCompact");
		}
	}
});