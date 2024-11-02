'use strict';
// 1. Import dependencies
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;

const app = express();
app.use(cors());
app.use(express.json());

// 2. Create Endpoint to generate payment token
app.post('/get-token', (req, res) => {
    const { amount, firstName, lastName, zip, memo } = req.body;

    // 3. Validate required fields
    if (!amount || !firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'Amount, first name, and last name are required.' });
    }

    // 4.Setup merchant authentication. add your login key and transaction key in the .env file
    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(process.env.MERCHANT_LOGIN_ID);
    merchantAuthenticationType.setTransactionKey(process.env.MERCHANT_TRANSACTION_KEY);

    // 5.Create transaction request
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setAmount(amount);

    // 6. Update billing information so that user do not need to fill it again
    transactionRequestType.setBillTo({
        firstName, lastName, zip, country: 'USA'
    });

    // 7. Add custom user field for memo
    const userField = new ApiContracts.UserField();
    userField.setName('Memo');
    userField.setValue(memo || 'none');  // Default value if memo is not provided

    const userFields = new ApiContracts.TransactionRequestType.UserFields();
    userFields.setUserField([userField]);

    // 8.Attach custom fields to transaction
    transactionRequestType.setUserFields(userFields);  // Attach the user fields to the transaction request

    // 9. Define hosted payment settings
    const setting1 = new ApiContracts.SettingType();
    setting1.setSettingName('hostedPaymentButtonOptions');
    setting1.setSettingValue('{"text": "Pay"}');

    const setting2 = new ApiContracts.SettingType();
    setting2.setSettingName('hostedPaymentOrderOptions');
    setting2.setSettingValue('{"show": false}');

    const setting3 = new ApiContracts.SettingType();
    setting3.setSettingName("hostedPaymentBillingAddressOptions");
    setting3.setSettingValue('{"show": true}');

    const setting4 = new ApiContracts.SettingType();
    setting4.setSettingName("hostedPaymentShippingAddressOptions");
    setting4.setSettingValue('{"show": false}');

    const settingList = [setting1, setting2, setting3, setting4];
    const alist = new ApiContracts.ArrayOfSetting();
    alist.setSetting(settingList);

    // 10. Create the request object
    const getRequest = new ApiContracts.GetHostedPaymentPageRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setTransactionRequest(transactionRequestType);
    getRequest.setHostedPaymentSettings(alist);

    const ctrl = new ApiControllers.GetHostedPaymentPageController(getRequest.getJSON());


    // 11. Execute the request
    ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.GetHostedPaymentPageResponse(apiResponse);

        if (response && response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
            // console.log('Hosted payment page token:', response.getToken());
            res.json({ success: true, token: response.getToken() });
        } else if (response) {
            // console.log('Error Code:', response.getMessages().getMessage()[0].getCode());
            // console.log('Error Message:', response.getMessages().getMessage()[0].getText());
            res.status(500).json({ success: false, error: response.getMessages().getMessage()[0].getText() });
        } else {
            console.error('Null response received');
            res.status(500).json({ success: false, error: 'Null response received' });
        }
    });
});

// 12. Start server on port 5000
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});

module.exports = app;


