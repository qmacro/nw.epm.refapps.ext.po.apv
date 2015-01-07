jQuery.sap.declare("nw.epm.refapps.ext.po.apv.util.messages");
jQuery.sap.require("sap.ca.ui.message.message");

nw.epm.refapps.ext.po.apv.util.messages = {

	// Show an error dialog with information from the oData response object.
	// oParameter - The object containing error information
	showErrorMessage: function(oParameter) {
		var oErrorDetails = nw.epm.refapps.ext.po.apv.util.messages._parseError(oParameter);
		var oMsgBox = sap.ca.ui.message.showMessageBox({
			type: sap.ca.ui.message.Type.ERROR,
			message: oErrorDetails.sMessage,
			details: oErrorDetails.sDetails
		});
		if (!sap.ui.Device.support.touch) {
			oMsgBox.addStyleClass("sapUiSizeCompact");
		}
	},

	_parseError: function(oParameter) {
		var sMessage = "",
			sDetails = "",
			oEvent = null,
			oResponse = null,
			oError = {};

		if (oParameter.mParameters) {
			oEvent = oParameter;
			sMessage = oEvent.getParameter("message");
			sDetails = oEvent.getParameter("responseText");
		} else {
			oResponse = oParameter;
			sMessage = oResponse.message;
			sDetails = oResponse.response.body;
		}

		if (jQuery.sap.startsWith(sDetails, "{\"error\":")) {
			var oErrModel = new sap.ui.model.json.JSONModel();
			oErrModel.setJSON(sDetails);
			sMessage = oErrModel.getProperty("/error/message/value");
		}

		oError.sDetails = sDetails;
		oError.sMessage = sMessage;
		return oError;
	}
};