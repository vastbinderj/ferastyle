angular.module("checkoutModule")

    .controller("checkoutAccordionController", [
        "$scope",
        "$location",
        "$q",
        "$interval",
        "$timeout",
        "$checkoutApiService",
        "$designImageService",
        "$visitorLoginService",
        "$cartService",
        "$designStateService",
        "$commonUtilService",
        "$checkoutService",
        "$giftCardsService",
        function (
            $scope,
            $location,
            $q,
            $interval,
            $timeout,
            $checkoutApiService,
            $designImageService,
            $visitorLoginService,
            $cartService,
            $designStateService,
            $commonUtilService,
            $checkoutService,
            $giftCardsService
        ) {

            var init, info, getDefaultAddress, getAddresses, enabledGuestCheckout,
                getPaymentInfo, creditCartTypes, isValidSteps, initWatchers, defaultChoosePaymentMethod,
                defaultSetPaymentData, defaultSetUseAsBilling;

            /**
             * Gets checkout information
             * @return {promise}
             */
            info = function () {
                var defer, initAddressesData, initCurrentShippingMethod, initCurrentPaymentType, initAdditionalInfo;

                defer = $q.defer();

                initAddressesData = function () {
                    if ($scope.checkout["shipping_address"] === null) {
                        $scope.checkout["shipping_address"] = getDefaultAddress();
                    }

                    if ($scope.checkout["billing_address"] === null) {
                        $scope.checkout["billing_address"] = getDefaultAddress();
                    }
                };

                initCurrentShippingMethod = function () {
                    var item, i;
                    for (i = 0; i < $scope.shippingMethods.length; i += 1) {
                        item = $scope.shippingMethods[i];

                        if ($scope.checkout["shipping_method_code"] === item.Method &&
                            $scope.checkout["shipping_rate"].Code === item.Rate) {

                            $scope.indexShippingMethod = i;
                            isValidSteps.shippingMethod = true;
                        }
                    }
                };

                initCurrentPaymentType = function () {
                    var item, i;

                    if (typeof $scope.paymentMethods !== "undefined") {
                        return true;
                    }

                    $scope.paymentMethods = $checkoutService.getAllowedPaymentMethods();
                    for (i = 0; i < $scope.paymentMethods.length; i += 1) {
                        item = $scope.paymentMethods[i];
                        if ($scope.checkout["payment_method_code"] === item.Code) {
                            $scope.paymentType = item.Type;
                            $scope.paymentMethods[i].cc = {};
                            $scope.paymentMethods[i].cc.type = "VI";
                            $scope.paymentMethods[i].cc["expire_month"] = "12";
                            $scope.paymentMethods[i].cc["expire_year"] = "2017";
                        }
                    }
                };

                initAdditionalInfo = function () {
                    if ($scope.isGuestCheckout && typeof $scope.customerInfo !== "undefined") {
                        isValidSteps.additionalInfo = $scope.customerInfo.$valid;
                    }
                };

                $checkoutService.update().then(
                    function (checkout) {
                        $scope.checkout = checkout;
                        initCurrentShippingMethod();
                        initCurrentPaymentType();
                        initAddressesData();
                        initAdditionalInfo();
                        defer.resolve(true);
                    }
                );

                return defer.promise;
            };

            initWatchers = function () {
                /**
                 * Sets payment method
                 */
                defaultChoosePaymentMethod = $scope.$watch("checkout.payment_method_code", function () {
                    if (typeof $scope.checkout !== "undefined" &&
                        typeof $scope.checkout["payment_method_code"] !== "undefined" &&
                        $scope.checkout["payment_method_code"] !== "" &&
                        $scope.checkout["payment_method_code"] !== null) {

                        $checkoutService.savePaymentMethod({
                            "method": $scope.checkout["payment_method_code"]
                        }).then(
                            function (response) {
                                if (response.result === "ok") {
                                    var isCreditCard;
                                    isCreditCard = $scope.paymentType.split("_").indexOf("cc") >= 0;
                                    if (isCreditCard) {
                                        var payment = getPaymentInfo();
                                        isValidSteps.paymentMethod = false;
                                        if (typeof payment.method != "undefined" && typeof payment.method.form != "undefined"){
                                            if (payment.method.form.$valid && $scope.validateCcNumber()) {
                                                isValidSteps.paymentMethod = true;
                                            }
                                        }
                                    } else {
                                        isValidSteps.paymentMethod = true;
                                    }
                                    info();
                                }
                            }
                        );
                    }
                });

                /**
                 * Sets payment method
                 */
                defaultSetPaymentData = $scope.$watch("paymentMethods", function () {
                    var payment = getPaymentInfo();

                    if (payment.method !== null && typeof payment.method.form !== "undefined" && payment.method.Type.split("_").indexOf("cc") >= 0) {

                        isValidSteps.paymentMethod = payment.method.form.$valid && $scope.validateCcNumber();
                    }

                }, true);

                defaultSetUseAsBilling = $scope.$watch("useAsBilling", function () {
                    if ($scope.useAsBilling && !$scope.isGuestCheckout && $scope.checkout["shipping_address"] !== null) {
                        $scope.choiceBilling($scope.checkout["shipping_address"]._id || false);
                    }

                    if ($scope.useAsBilling && $scope.isGuestCheckout) {
                        $scope.choiceShipping(false);
                    }
                }, true);
            };

            init = function () {
                getDefaultAddress = function () {
                    return {
                        "street": "",
                        "city": "",
                        "state": "",
                        "phone": "",
                        "zip_code": "",
                        "company": "",
                        "first_name": "",
                        "last_name": "",
                        "address_line1": "",
                        "address_line2": "",
                        "country": ""
                    };
                };

                creditCartTypes = {
                    'VI': [new RegExp('^4[0-9]{12}([0-9]{3})?$'), new RegExp('^[0-9]{3}$'), true],
                    'MC': [new RegExp('^5[1-5][0-9]{14}$'), new RegExp('^[0-9]{3}$'), true],
                    'AX': [new RegExp('^3[47][0-9]{13}$'), new RegExp('^[0-9]{3}$'), true],
                    'DS': [new RegExp('^6(?:011|5[0-9]{2})[0-9]{12}$'), new RegExp('^[0-9]{3}$'), true]
                };

                isValidSteps = {
                    "billingAddress": false,
                    "shippingAddress": false,
                    "shippingMethod": false,
                    "paymentMethod": false,
                    "discounts": true
                };
                $scope["checkoutService"] = $checkoutService;

                $scope["countries"] = [
                    {
                        "Code": "US",
                        "Name": "USA"
                    }
                ];
                $scope["creditTypes"] = [
                    {
                        "Code": "VI",
                        "Name": "Visa"
                    },
                    {
                        "Code": "MC",
                        "Name": "Master Card"
                    },
                    {
                        "Code": "DS",
                        "Name": "Discover"
                    },
                    {
                        "Code": "AX",
                        "Name": "American Express"
                     }
                ];

                $scope["useAsBilling"] = false;
                $scope["states"] = $designStateService;
                $scope["cart"] = $cartService;
                $scope["shippingMethods"] = [];
                $scope["checkout"] = {};
                $scope["shipping_address"] = getDefaultAddress();
                $scope["billing_address"] = getDefaultAddress();
                $scope["totals"] = 0;

                info();
            };

            enabledGuestCheckout = function () {
                $scope.subAdditionalInfo = false;
                return angular.appConfigValue("general.checkout.guest_checkout");
            };

            /**
             * Gets visitor addresses
             */
            getAddresses = function () {
                if (!$scope["isGuestCheckout"]) {
                    $checkoutApiService.getAddresses().$promise.then(
                        function (response) {
                            var result = response.result || [];
                            $scope.addresses = result;
                        }
                    );
                }
            };

            /**
             * Checks visitor on the logged
             * Adds breadcrumbs
             * Gets checkout information
             */
            $scope.init = function () {
                var stopWaiting, stop;
                stopWaiting = function () {
                    if (typeof $checkoutService.getType() !== "undefined") {
                        $interval.cancel(stop);
                        stop = undefined;
                    }
                };
                stop = $interval(function () {
                    if (typeof $checkoutService.getType() !== "undefined") {
                        stopWaiting();
                        if ("accordion" !== $checkoutService.getType()) {
                            $location.path($checkoutService.getUrl().replace("#/", ""));
                        }

                        $cartService.init().then(function () {
                            if ($cartService.getCountItems() === 0) {
                                $location.path("/");
                            } else {
                                if (!enabledGuestCheckout()) {
                                    $scope.isGuestCheckout = false;
                                    $visitorLoginService.isLoggedIn().then(function (isLoggedIn) {
                                        if (!isLoggedIn) {
                                            $location.path("/");
                                        } else {
                                            getAddresses();
                                            $checkoutService.init().then(function () {
                                                init();
                                                $scope.shippingMethods = $checkoutService.getAllowedShippingMethods();
                                                var defaultMethod = $checkoutService.getMinimalCostShippingMethods();
                                                $scope.indexShippingMethod = defaultMethod.index;
                                                $scope.choiceShippingMethod($scope.indexShippingMethod);
                                                initWatchers();
                                            });
                                        }
                                    });
                                } else {
                                    $visitorLoginService.isLoggedIn().then(function (isLoggedIn) {
                                        if (!isLoggedIn) {
                                            $scope.isGuestCheckout = true;
                                        } else {
                                            $scope.isGuestCheckout = false;
                                        }
                                        getAddresses();
                                        $checkoutService.init().then(function () {
                                            init();
                                            $scope.shippingMethods = $checkoutService.getAllowedShippingMethods();
                                            var defaultMethod = $checkoutService.getMinimalCostShippingMethods();
                                            $scope.indexShippingMethod = defaultMethod.index;
                                            $scope.choiceShippingMethod($scope.indexShippingMethod);
                                            initWatchers();
                                        });
                                    });
                                }
                            }
                        });
                    }
                }, 100);


                $scope.$emit("add-breadcrumbs", {"label": "My Account", "url": "/account"});
                $scope.$emit("add-breadcrumbs", {"label": "Checkout", "url": "/checkout"});
            };

            getPaymentInfo = function () {
                var i, info;
                info = {
                    "method": null,
                    "form": null
                };
                if (typeof $scope.paymentMethods !== "undefined") {
                    for (i = 0; i < $scope.paymentMethods.length; i += 1) {
                        if ($scope.paymentMethods[i].Code === $scope.checkout["payment_method_code"]) {
                            info.method = $scope.paymentMethods[i];
                            info.form = info.method.form;
                        }
                    }
                }

                return info;
            };

            $scope.newBilling = function () {
                // Sets submitted billing form in false
                $scope.subBillingAddress = false;
                // Sets a flag of form is not valid
                isValidSteps.billingAddress = false;
                // Initialise address by default
                $scope.checkout["billing_address"] = getDefaultAddress();
                $scope.useAsBilling = false;

                for (var field in $scope.checkout["billing_address"]) {
                    if ($scope.billingAddress.hasOwnProperty(field)) {
                        $scope.billingAddress[field].$pristine = true;
                        $scope.billingAddress[field].$invalid = false;
                    }
                }
            };

            $scope.newShipping = function () {
                // Sets submitted shipping form in false
                $scope.subShippingAddress = false;
                // Sets a flag of form is not valid
                isValidSteps.shippingAddress = false;
                // Initialise address by default
                $scope.checkout["shipping_address"] = getDefaultAddress();

                for (var field in $scope.checkout["shipping_address"]) {
                    if ($scope.shippingAddress.hasOwnProperty(field)) {
                        $scope.shippingAddress[field].$pristine = true;
                        $scope.shippingAddress[field].$invalid = false;
                    }
                }
            };

            $scope.choiceBilling = function (billingId) {
                if ($scope.isGuestCheckout && $scope.shippingAddress.$valid) {
                    $checkoutService.saveBillingAddress($scope.checkout["shipping_address"]).then(
                        function (response) {
                            if (response.error === null) {
                                isValidSteps.billingAddress = true;
                            }
                            // update checkout
                            info();
                        }
                    );
                } else if ($scope.checkout["billing_address"] !== null && $scope.checkout["billing_address"]._id !== billingId && typeof billingId === "string" && billingId !== "") {
                    // Sets existing address as billing
                    $checkoutService.saveBillingAddress({"id": billingId}).then(
                        function (response) {
                            if (response.error === null) {
                                isValidSteps.billingAddress = true;
                            }
                            // update checkout
                            info();
                        }
                    );
                } else {
                    if ($scope.shippingAddress.$valid) {
                        $checkoutService.saveBillingAddress($scope.checkout["shipping_address"]).then(
                            function (response) {
                                if (response.error === null) {
                                    isValidSteps.billingAddress = true;
                                }
                                // update checkout
                                info();
                            }
                        );
                    }
                }
            };

            $scope.choiceShipping = function (shippingId) {
                if ($scope.isGuestCheckout) {
                    $checkoutService.saveShippingAddress($scope.checkout["shipping_address"]).then(
                        function (response) {
                            // update checkout
                            info().then(function () {
                                // if all ok, must update allowed shipping methods list
                                // and must set billing address if set appropriate checkbox
                                if (response.error === null) {
                                    $checkoutService.loadShippingMethods().then(function (methods) {
                                        $scope.shippingMethods = methods;
                                    });
                                    // sets billing address
                                    if ($scope.useAsBilling) {
                                        $scope.choiceBilling(response.result);
                                    }
                                }
                            });
                        }
                    );
                } else if (($scope.checkout["shipping_address"] !== null && $scope.checkout["shipping_address"]._id !== shippingId) || Boolean(shippingId)) {

                    // Sets existing address as shipping
                    $checkoutService.saveShippingAddress({"id": shippingId}).then(
                        function (response) {
                            // update checkout
                            info().then(function () {
                                // if all ok, must update allowed shipping methods list
                                // and must set billing address if set appropriate checkbox
                                if (response.error === null) {
                                    isValidSteps.shippingAddress = true;
                                    $checkoutService.loadShippingMethods().then(function (methods) {
                                        $scope.shippingMethods = methods;
                                    });
                                    // sets billing address
                                    if ($scope.useAsBilling) {
                                        $scope.choiceBilling(response.result._id);
                                    }
                                } else {
                                    isValidSteps.billingAddress = false;
                                }
                            });
                        }
                    );
                }
            };

            $scope.choiceShippingMethod = function (index) {

                if (typeof index !== "undefined" && index !== "") {
                    $checkoutService.saveShippingMethod({
                        "method": $scope.shippingMethods[index].Method,
                        "rate": $scope.shippingMethods[index].Rate
                    }).then(
                        function (response) {
                            if (response.result === "ok") {
                                // update checkout
                                info();
                            }
                        }
                    );
                }
            };

            $scope.back = function (step) {
                if (step === "review" && !$scope["isGuestCheckout"]) {
                    $("#" + step).slideUp("slow").parents('.panel').prev('.panel').prev('.panel').find('.accordion').slideDown(500);
                } else {
                    $("#" + step).slideUp("slow").parents('.panel').prev('.panel').find('.accordion').slideDown(500);
                }
            };

            $scope.next = function (step) {
                /*jshint maxcomplexity:6 */
                var actionBillingAddress, actionShippingAddress, actionPaymentMethod, actionCustomerAdditionalInfo, actionDiscount, actionDefault;

                actionBillingAddress = function () {
                    $scope.subBillingAddress = true;
                    if ($scope.billingAddress.$valid) {
                        isValidSteps.billingAddress = true;
                        if ((!Boolean($scope.checkout["billing_address"]._id) && !$scope["isGuestCheckout"]) || $scope["isGuestCheckout"]) {
                            $checkoutService.saveBillingAddress($scope.checkout["billing_address"]).then(
                                function () {
                                    getAddresses();
                                    // update checkout
                                    info();
                                    $("#" + step).slideUp("slow").parents('.panel').next('.panel').find('.accordion').slideDown(500);
                                }
                            );
                        } else {
                            $("#" + step).slideUp("slow").parents('.panel').next('.panel').find('.accordion').slideDown(500);
                        }
                    }
                };

                actionShippingAddress = function () {
                    $scope.subShippingAddress = true;
                    if ($scope.shippingAddress.$valid) {
                        isValidSteps.shippingAddress = true;
                        if ((!Boolean($scope.checkout["shipping_address"]._id) && !$scope["isGuestCheckout"]) || $scope["isGuestCheckout"]) {
                            $checkoutService.saveShippingAddress($scope.checkout["shipping_address"]).then(
                                function () {
                                    getAddresses();
                                    $checkoutService.loadShippingMethods().then(function (methods) {
                                        $scope.shippingMethods = methods;
                                    });
                                    if ($scope.useAsBilling) {
                                        $checkoutService.saveBillingAddress($scope.checkout["shipping_address"]).then(function (response) {
                                            if (response.error === null) {
                                                isValidSteps.billingAddress = true;
                                            }
                                            // update checkout
                                            info();
                                            $("#" + step).slideUp("slow").parents('.panel').next('.panel').next('.panel').find('.accordion').slideDown(500);
                                        });
                                    } else {
                                        // update checkout
                                        info();
                                        $("#" + step).slideUp("slow").parents('.panel').next('.panel').find('.accordion').slideDown(500);
                                    }
                                }
                            );
                        } else {
                            if ($scope.useAsBilling) {
                                isValidSteps.billingAddress = true;
                                $("#" + step).slideUp("slow").parents('.panel').next('.panel').next('.panel').find('.accordion').slideDown(500);
                            } else {
                                $("#" + step).slideUp("slow").parents('.panel').next('.panel').find('.accordion').slideDown(500);
                            }
                        }
                    }
                };

                actionPaymentMethod = function () {
                    $scope.subPaymentForm = true;

                    var _proceed = function() {
                        var $nextPanel = $("#" + step).slideUp("slow").parents('.panel').next('.panel');

                        // We skip the guest checkout data collection step if they aren't guests
                        if (!$scope.isGuestCheckout) {
                            $nextPanel = $nextPanel.next('.panel');
                        }

                        $nextPanel.find('.accordion').slideDown(500);
                    }

                    if (isValidSteps[step]) {
                        var isCreditCard;
                        if (typeof $scope.paymentType !== "undefined") {
                            isCreditCard = $scope.paymentType.split("_").indexOf("cc") >= 0;
                            if (isCreditCard) {
                                var payment = getPaymentInfo();
                                payment.method.form.submited = true;
                                if (payment.method.form.$valid && $scope.validateCcNumber()) {
                                    $checkoutService.saveAdditionalInfo({"cc": payment["method"]["cc"]});
                                }
                            }
                        }
                        _proceed();
                    } else {
                        var isCreditCard;
                        if (typeof $scope.paymentType !== "undefined") {
                            isCreditCard = $scope.paymentType.split("_").indexOf("cc") >= 0;
                            if (isCreditCard) {
                                var payment = getPaymentInfo();
                                payment.method.form.submited = true;
                                if (payment.method.form.$valid && $scope.validateCcNumber()) {
                                    $checkoutService.saveAdditionalInfo({"cc": payment["method"]["cc"]});
                                    _proceed();
                                }
                            }
                        }
                    }

                };

                actionCustomerAdditionalInfo = function () {
                    $scope.subAdditionalInfo = true;

                    if ($scope.isGuestCheckout) {
                        if ($scope.customerInfo.$valid) {
                            $checkoutService.saveAdditionalInfo({
                                "customer_email": $scope.checkout.info.customer_email,
                                "customer_name": $scope.checkout.info.customer_name
                            }).then(function () {
                                // resp.result == 'ok'
                                $("#" + step).slideUp("slow").parents('.panel').next('.panel').find('.accordion').slideDown(500);
                            });
                        }
                    } else {
                        $("#" + step).slideUp("slow").parents('.panel').next('.panel').find('.accordion').slideDown(500);
                    }
                };

                actionDiscount = function () {
                    // Discounts step is always valid
                    // If the grand total is 0 we can set the paymentMethod step to valid and jump over it.
                    if ($scope.checkout.grandtotal <= 0)  {
                        isValidSteps.paymentMethod = true;
                        $("#" + step).slideUp(500).parents('.panel').next('.panel').next('.panel').find('.accordion').slideDown(500);

                    } else {
                        isValidSteps.paymentMethod = false;
                        $("#" + step).slideUp(500).parents('.panel').next('.panel').find('.accordion').slideDown(500);
                    }
                };

                actionDefault = function () {
                    if (isValidSteps[step]) {
                        $("#" + step).slideUp(500).parents('.panel').next('.panel').find('.accordion').slideDown(500);
                    }
                };

                switch (step) {
                    case "billingAddress":
                        actionBillingAddress();
                        break;
                    case "shippingAddress":
                        actionShippingAddress();
                        break;
                    case "paymentMethod":
                        actionPaymentMethod();
                        break;
                    case "customerInfo":
                        actionCustomerAdditionalInfo();
                        break;
                    case "discounts":
                        actionDiscount();
                        break;
                    default:
                        actionDefault();
                }

            };// jshint ignore:line

            $scope.setPaymentType = function (type) {
                $scope.paymentType = type;
            };

            $scope.isCreditCard = function () {
                if (typeof $scope.paymentType !== "undefined") {
                    return $scope.paymentType.split("_").indexOf("cc") >= 0;
                }
                return false;
            };

            $scope.showFormCc = function (method) {
                if (typeof method !== "undefined") {
                    return method.Type.split("_").indexOf("cc") >= 0;
                }
                return false;
            };

            $scope.closeSuccessPopup = function () {
                $(".modal").modal("hide");
                $(".modal-open").removeClass('modal-open');
                $location.path("/");
            };

            /**
             * Saves checkout
             */
            $scope.save = function () {
                var payment, isValid, sendPostForm;
                $scope.message = "";
                isValid = function () {
                    var result, message, getErrorMsg;
                    message = "";
                    result = {
                        status: true,
                        message: ""
                    };
                    $scope.subBillingAddress = true;
                    $scope.subShippingAddress = true;
                    $scope.subPaymentForm = true;
                    $scope.subAdditionalInfo = true;

                    getErrorMsg = function (step) {
                        /*jshint maxcomplexity:6 */
                        var msg = "Please fill all required fields";

                        switch (step) {
                            case "billingAddress":
                                msg = "Please fill all required fields in billing section <br />";
                                break;
                            case "shippingAddress":
                                msg = "Please fill all required fields in shipping section <br />";
                                break;
                            case "shippingMethod":
                                msg = "Please choose shipping method <br />";
                                break;
                            case "paymentMethod":
                                msg = "Please choose payment method <br />";
                                break;
                            case "additionalInfo":
                                msg = "Please fill all required fields in additional section <br />";
                                break;
                        }
                        return msg;
                    };

                    for (var step in isValidSteps) {
                        if (isValidSteps.hasOwnProperty(step) && !isValidSteps[step]) {
                            message += getErrorMsg(step);
                            result = {
                                status: false,
                                message: message
                            };
                        }
                    }

                    return result;
                };

                sendPostForm = function (method, response) {
                    var form;

                    form = "<div class='hidden' id='auth_net_form'>" + response.result;
                    form = form.replace("$CC_NUM", method.cc.number);
                    form = form.replace("$CC_MONTH", method.cc["expire_month"].toString().length < 2 ? "0" + method.cc["expire_month"] : method.cc["expire_month"]);
                    form = form.replace("$CC_YEAR", method.cc["expire_year"]) + "</div>";

                    $("body").append(form);
                    $("#auth_net_form").find("form").submit();
                    $("#auth_net_form").remove();
                };

                payment = getPaymentInfo();
                if (payment.form !== null && typeof payment.form !== "undefined") {
                    payment.form.submited = true;
                }
                info().then(function () {
                    var checkoutValid = isValid();
                    if (checkoutValid.status) {
                        $(this).parents('.confirm').css('display', 'none');
                        $('#processing').modal('show');
                        $checkoutApiService.save().$promise.then(
                            function (response) {
                                if (response.error === null && null !== payment.method && payment.method.Type === "remote" && response.result === "redirect") {
                                    window.location.replace(response.redirect);
                                } else if (response.error === null && null !== payment.method && payment.method.Type === "post_cc") {
                                    // Handler for direct post form for Authorize.net
                                    sendPostForm(payment.method, response);
                                } else if (response.error === null) {
                                    info();
                                    $cartService.reload().then(
                                        function () {
                                            $scope.purchase = response.result || {};

                                            //TODO: clean this up with angular modals and promises
                                            $('#processing').modal('hide');
                                            $timeout(function(){
                                                $location.path("/checkout/success/"+ response.result.increment_id);
                                            }, 600);
                                        }
                                    );
                                } else {
                                    $(this).parents('.confirm').css('display', 'block');
                                    $('#processing').modal('hide');
                                    // Errors from server
                                    $scope.message = $commonUtilService.getMessage(response);
                                }
                            }
                        );
                    } else {
                        $(this).parents('.confirm').css('display', 'block');
                        $('#processing').modal('hide');
                        $scope.message = $commonUtilService.getMessage(null, "danger", checkoutValid.message);
                    }
                });
            };

            $scope.giftcard = {};
            $scope.giftcard.apply = function() {
                if ($scope.giftcard.code) {
                    $scope.giftcard.searching = true;
                    $giftCardsService.apply($scope.giftcard.code)
                    .then(function(response) {

                        $scope.giftcard.searching = false;
                        if (response.error === null) {
                            info();
                            // $scope.giftcard.message = $commonUtilService.getMessage(null, "warning", "Please enter a gift card code before submitting.");
                        } else {
                            $scope.giftcard.message = $commonUtilService.getMessage(response);
                        }

                    });
                } else {
                    $scope.giftcard.message = $commonUtilService.getMessage(null, "danger", "Gift card code can't be empty");
                }
            }

            $scope.discountApply = function () {
                if ("" === $scope.discount || typeof $scope.discount === "undefined") {
                    $scope.messageDiscounts = $commonUtilService.getMessage(null, "danger", "Discount code can't be empty");
                } else {
                    $checkoutService.discountApply({"coupon": $scope.discount}).then(
                        function (response) {
                            if (response.error === null) {
                                info();
                            } else {
                                $scope.messageDiscounts = $commonUtilService.getMessage(response);
                                $scope.discount = "";
                            }
                        }
                    );
                }
            };

            $scope.discountNeglect = function (code) {
                $checkoutService.discountNeglect({"coupon": code}).then(
                    function (response) {
                        if (response.error === null) {
                            info();
                        }
                    }
                );
            };

            $scope.validateCcNumber = function () {
                var i, payment, result;
                result = false;

                payment = getPaymentInfo();

                var validateCreditCard = function (s) {
                    /*jshint maxcomplexity:6 */
                    // remove non-numerics
                    var a, c, m, k, j, x, w, v;
                    v = "0123456789";
                    w = "";
                    for (i = 0; i < s.length; i += 1) {
                        x = s.charAt(i);
                        if (v.indexOf(x, 0) !== -1) {
                            w += x;
                        }
                    }
                    // validate number
                    j = w.length / 2;
                    k = Math.floor(j);
                    m = Math.ceil(j) - k;
                    c = 0;
                    for (i = 0; i < k; i += 1) {
                        a = w.charAt(i * 2 + m) * 2;
                        c += a > 9 ? Math.floor(a / 10 + a % 10) : a;
                    }
                    for (i = 0; i < k + m; i += 1) {
                        c += w.charAt(i * 2 + 1 - m) * 1;
                    }
                    return (c % 10 === 0);
                };

                if (payment.method === null && payment.form === null) {
                    return false;
                }

                if (creditCartTypes[payment.method.cc.type][0].test(payment.method.cc.number) === true) {
                    result = validateCreditCard(payment.method.cc.number);
                }

                if (typeof payment.form !== "undefined") {
                    payment.form.number.$invalidFormat = result;
                }

                return result;
            };
        }
    ]
);
