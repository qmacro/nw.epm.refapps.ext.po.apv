jQuery.sap.declare("nw.epm.refapps.ext.po.apv.util.formatter");
jQuery.sap.require("sap.ca.ui.model.format.DateFormat");
jQuery.sap.require("sap.ca.ui.model.format.NumberFormat");

nw.epm.refapps.ext.po.apv.util.formatter = {

	getBundle: function(oControl) {
		return oControl.getModel("i18n").getResourceBundle();
	},

	dateAgoFormatter: sap.ca.ui.model.format.DateFormat.getDateInstance({
		style: "daysAgo"
	}),

	daysAgo: function(dDate) {
		if (!dDate) {
			return "";
		}
		return nw.epm.refapps.ext.po.apv.util.formatter.dateAgoFormatter.format(dDate);
	},

	amountFormatter: sap.ui.core.format.NumberFormat.getCurrencyInstance(),

	amountWithCurrency: function(iAmount, sCurrency) {
		if (!iAmount || !sCurrency) {
			return "";
		}
		var oBundle = nw.epm.refapps.ext.po.apv.util.formatter.getBundle(this);
		var _iAmount = nw.epm.refapps.ext.po.apv.util.formatter.amountFormatter.format(iAmount);
		return oBundle.getText("xfld.amount", [_iAmount, sCurrency]);
	},

	amountWithOutCurrency: function(iAmount) {
		if (!iAmount) {
			return "";
		}
		return nw.epm.refapps.ext.po.apv.util.formatter.amountFormatter.format(iAmount);
	},

	items: function(iItems) {

		var oBundle = nw.epm.refapps.ext.po.apv.util.formatter.getBundle(this);

		if (isNaN(iItems)) {
			return "";
		}

		if (iItems === 1) {
			return oBundle.getText("xfld.item");
		}

		return oBundle.getText("xfld.items", [iItems]);
	},

	deliveryDateFormatter: sap.ca.ui.model.format.DateFormat.getDateInstance({
		style: "medium"
	}),

	deliveryDate: function(dDate) {
		if (!dDate) {
			return "";
		}
		return nw.epm.refapps.ext.po.apv.util.formatter.deliveryDateFormatter.format(dDate);
	},

	orderedBy: function(sOrderedByName) {
		var oBundle = nw.epm.refapps.ext.po.apv.util.formatter.getBundle(this);
		return sOrderedByName ? oBundle.getText("xfld.orderedBy", [sOrderedByName]) : "";
	},

	deliveryDateAndLater: function(dDate, bLater) {

		var oBundle = nw.epm.refapps.ext.po.apv.util.formatter.getBundle(this);
		if (!dDate) {
			return "";
		}
		var _sDelDate = nw.epm.refapps.ext.po.apv.util.formatter.deliveryDateFormatter.format(dDate);
		if (bLater) {
			return oBundle.getText("xfld.andLater", [_sDelDate]);
		} else {
			return _sDelDate;
		}
	}

};