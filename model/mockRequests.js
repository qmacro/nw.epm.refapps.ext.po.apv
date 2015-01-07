jQuery.sap.declare("nw.epm.refapps.ext.po.apv.model.mockRequests");
// In mock mode, the mock server intercepts HTTP calls and provides fake output to the
// client without involving a backend system. But special backend logic, such as that 
// performed by function imports, is not automatically known to the mock server. To handle
// such cases, the app needs to define specific mock requests that simulate the backend 
// logic using standard HTTP requests (that are again interpreted by the mock server) as 
// shown below. 

// Please note:
// The usage of synchronous calls is only allowed in this context because the requests are
// handled by a latency-free client-side mock server. In production coding, asynchronous
// calls are mandatory.

nw.epm.refapps.ext.po.apv.model.mockRequests = {};

nw.epm.refapps.ext.po.apv.model.mockRequests.mockApprovePo = function() {
	return {
		// This mock request simulates the function import "ApprovePurchaseOrder",
		// which is triggered when the user chooses the "Approve" button.
		// It removes the approved purchase order from the mock data.
		method: "POST",
		path: new RegExp("ApprovePurchaseOrder\\?POId=(.*)"),
		response: nw.epm.refapps.ext.po.apv.model.mockRequests._deletePo
	};
};

nw.epm.refapps.ext.po.apv.model.mockRequests.mockRejectPo = function() {
	return {
		// This mock request simulates the function import "RejectPurchaseOrder",
		// which is triggered when the user chooses the "Reject" button.
		// It removes the rejected purchase order from the mock data.
		method: "POST",
		path: new RegExp("RejectPurchaseOrder\\?POId=(.*)"),
		response: nw.epm.refapps.ext.po.apv.model.mockRequests._deletePo
	};
};

nw.epm.refapps.ext.po.apv.model.mockRequests.getRequests = function() {
	return [nw.epm.refapps.ext.po.apv.model.mockRequests.mockApprovePo(),
	        nw.epm.refapps.ext.po.apv.model.mockRequests.mockRejectPo()
            ];
};

nw.epm.refapps.ext.po.apv.model.mockRequests._deletePo = function(oXhr, sUrlParams) {
	var sErrorTxt = "";
	var bError = false;
	// Extract purchase order ID from the URL parameters
	var sParams = decodeURIComponent(sUrlParams);
	var sPoId = sParams.substring(1, sParams.indexOf("&") - 1);

	// deletePo items - this also deletes the PO...
	var oResponseDeletePoItems = jQuery.sap.sjax({
		url: "/sap/opu/odata/sap/EPM_REF_APPS_PO_APV_SRV/PurchaseOrders('" + sPoId + "')/PurchaseOrderItems",
		type: "DELETE"
	});
	if (!oResponseDeletePoItems.success) {
		sErrorTxt = "Removing purchase order items from mock data failed";
		bError = true;
	}

	if (bError) {
		oXhr.respond(400, null, sErrorTxt);
	} else {
		oXhr.respondJSON(200, {}, JSON.stringify({
			d: {
				results: []
			}
		}));
	}
};