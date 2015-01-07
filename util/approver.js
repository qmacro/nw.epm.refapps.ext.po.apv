jQuery.sap.declare("nw.epm.refapps.ext.po.apv.util.approver");

// Utility for performing an approve/reject action
nw.epm.refapps.ext.po.apv.util.approver = {
    
    // This method performs one approve/reject action. More precisely, it offers the following services
    // - Perform the function import for approving/rejecting in the backend
    // - Generic error handling
    // - Generic closing of an (optional) confirmation dialog
    // - Generic success message
    // Parameters:
    // - bApprove      - flag whether this is an approve or a reject action
    // - oView         - the view using this service (actually only used for retrieving models)
    // - sPOId         - ID of the PO to be approved/rejected
    // - sSupplier     - name of the supplier of the PO
    // - sApprovalNote - Note for this approval/rejection
    // - fnSuccess     - optional custom success handler
    // - oOpenDialog   - optional dialog which should be closed when response from backend has been received   
    /* eslint-disable */     // using more then 4 parameters for a function is justified here
    approve : function(bApprove, oView, sPOId, sSupplier, sApprovalNote, fnSuccess, oOpenDialog){
        var fnOnError = function(oResponse) {
		    if (oOpenDialog){ oOpenDialog.close(); }
		    jQuery.sap.require("nw.epm.refapps.ext.po.apv.util.messages");
		    nw.epm.refapps.ext.po.apv.util.messages.showErrorMessage(oResponse);
	    };
	    var fnOk = function(){
	        if (oOpenDialog){ oOpenDialog.close(); }
	        if (fnSuccess) { fnSuccess(); }
		    var oResourceBundle = oView.getModel("i18n").getResourceBundle();
		    var sSuccessMessage = oResourceBundle.getText(bApprove ? "ymsg.approvalMessageToast" : "ymsg.rejectionMessageToast", [sSupplier]);
		    sap.m.MessageToast.show(sSuccessMessage);	        
	    };
		var sFunction = bApprove ? "ApprovePurchaseOrder" : "RejectPurchaseOrder";
		oView.getModel().callFunction(sFunction, {
			method: "POST",
			urlParameters: {
				POId: sPOId,
				Note: sApprovalNote
			},
			success: fnOk,
			error: fnOnError
		});
    }
};