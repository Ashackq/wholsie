var searchInput = 'delivery_address';
var offer_offset = address_offset = 0;
$(document).ready(function () {
    calculate_sub_total();

    var kitchen_id = $('input[name="kitchen_id[]"]').val();
    get_offers(kitchen_id);
    get_address();
});
$(document).on('click', '.add_item_qty', function () {
    var cart_id = parseInt($(this).attr("id").match(/\d+/));    
    var reference_id = parseInt($(this).attr("data-menuid"));
    let mealcount = parseInt($('#item_qty_' + cart_id).val());
    if (mealcount == "") {
        mealcount = 1;
        $('#item_qty_' + cart_id).val(parseInt(mealcount));
        $('#btn-container' + cart_id).css({ 'background-color': '#FCC647' });
        $('#item_qty_' + cart_id).css({ 'font-weight': 'bold' });
    } else {
        mealcount = parseInt(mealcount) + 1;
        $('#item_qty_' + cart_id).val(mealcount);
        $('#item_qty_' + cart_id).css({ 'font-weight': 'bold' });
    }
    editcart(cart_id, reference_id, 1);
});
$(document).on('click', '.remove_item_qty', function () {
    var cart_id = parseInt($(this).attr("id").match(/\d+/));    
    var reference_id = parseInt($(this).attr("data-menuid"));
    let mealcount = parseInt($('#item_qty_' + cart_id).val());
    if (mealcount <= 1) {
        remove_cart_item(cart_id);
    } else {
        mealcount = parseInt(mealcount) - 1;
        $('#item_qty_' + cart_id).val(mealcount);
        $('#item_qty_' + cart_id).css({ 'font-weight': 'bold' });
        if ($('#item_qty_' + cart_id).val(mealcount) == 0) {
            mealcount = 'Add';
            $('#btn-container' + cart_id).css({ 'background-color': 'transparent' });
        }
        editcart(cart_id, reference_id, 0);
    }
});
$(document).on('change', '#wallet_payment_method', function () {
    calculate_sub_total();
});
function get_address() {

    $.ajax({
        url: SITE_URL + 'cart_checkout/get-address',
        type: 'POST',
        data: { offset: parseInt(address_offset) },
        dataType: 'json',
        beforeSend: function () {
            $(".adrs.load_more_button").css({ 'opacity': '0.3', "pointer-events": "none" }).prop("disabled", true);
            $(".adrs.load_more_button a").text('Loading...');
        },
        success: function (response) {

            $("#checkout_address_list").append(response.html);
            address_offset = parseInt(address_offset) + parseInt(PER_PAGE_ADDRESS);

            if (parseInt(address_offset) >= parseInt(response.totalrows)) {
                $(".adrs.load_more_button").hide();
            } else {
                $(".adrs.load_more_button").show();
            }

        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
        complete: function () {
            $(".adrs.load_more_button").css({ 'opacity': '1', "pointer-events": "unset" }).prop("disabled", false);
            $(".adrs.load_more_button a").text('Load More');
        },
    });
}

function calculate_menu_price(cart_id) {

    var qty = $('#item_qty_' + cart_id).val();
    var itemprice = $('#tm_itemprice' + cart_id).val();
    
    var total_menu_price = parseFloat(itemprice) * parseFloat(qty);
    $("#total_menu_price" + cart_id).val(parseFloat(total_menu_price).toFixed(2));
    $("#txt_total_menu_price" + cart_id).html(formatter.format(parseFloat(total_menu_price).toFixed(2)));

    check_offer_code(0);
    calculate_sub_total();
}

function calculate_sub_total() 
{
    var is_wallet = ($("input[id=wallet_payment_method]").is(":checked") ? 1 : 0);

    $.ajax({
        url: SITE_URL + 'cart_checkout/calculate-order-summary',
        type: 'POST',
        data: { is_wallet: is_wallet },
        dataType: 'json',
        beforeSend: function () {
            $('body').css({ 'pointer-events': 'none', 'opacity': '.3' });
        },
        success: function (response) {
            $('body').css({ 'pointer-events': 'auto', 'opacity': '1' });
            if(response.status){
                $("#item_total_amount").html(formatter.format(parseFloat(response['order_amount']).toFixed(2)));
                var txt_delivery_charge = ((response['actual_delivery_charges'] > 0) ? '<span class="oldprice mr-2" style="font-size: 12px;color: #6c6a6a;">' + formatter.format(parseFloat(response['actual_delivery_charges']).toFixed(2)) + "</span>" : "") + formatter.format(parseFloat(response['delivery_charge']).toFixed(2));
                
                $("#delivery_charge_amount").html(txt_delivery_charge);
                if (parseFloat(response['delivery_charge']) <= 0) {
                    $("#freedelivery").show();
                } else {
                    $("#freedelivery").hide();
                }
    
                var txt_packaging_charge = ((response['actual_packaging_charges'] > 0) ? '<span class="oldprice mr-2" style="font-size: 12px;color: #6c6a6a;">' + formatter.format(parseFloat(response['actual_packaging_charges']).toFixed(2)) + "</span>" : "") + formatter.format(parseFloat(response['packaging_charge']).toFixed(2));
                $("#packaging_charge").html(txt_packaging_charge);
                
                if (parseFloat(response['packaging_charge']) > 0){
                    $('#packaging_charges_row').removeClass('d-none'); 
                }else{
                    $('#packaging_charges_row').addClass('d-none'); 
                }
                
                $("#gst_tax_amount").html(formatter.format(parseFloat(response['tax_amount']).toFixed(2)));
                $("#coupon_ammount").html('-' + formatter.format(parseFloat(response['coupon_amount']).toFixed(2)));
                $("#sub_total").html(formatter.format(parseFloat(response['order_total']).toFixed(2)));
                
                $("#remain_amount").html(formatter.format(parseFloat(response['total_pay_online_amount']).toFixed(2)));

                if (parseFloat(response['total_pay_online_amount']) <= 0) {
                    $("#netbanking").hide().css({ "border": "0" });
                } else {
                    $("#netbanking").show().css({ "border": "1px solid rgba(0, 0, 0, .125)" });
                }
            }            
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}
function newFunction(wallet_payment_method, total) {
    if (wallet_payment_method > 0) {
        var total = total;
    }
    else (wallet_payment_method < 0)
    {
        var total = total;
        return total;
    }
}
function check_offer_code(check_valid = 1, calculate_total = 0) {
    var offercode = $("#offercode").val();

    $("#offercode").css("border-bottom", "1px solid #E8E9F2");

    if (offercode == "" && check_valid == 1) {
        toastr.error("Please enter offer code !");
        $("#offercode").css("border-bottom", "1px solid #ff0000").focus();
    } else {
        $.ajax({
            url: SITE_URL + 'cart_checkout/check-offer-code',
            type: 'POST',
            data: { offercode: offercode },
            dataType: 'json',
            success: function (response) {

                if (response['type'] == 1) {
                    if (check_valid == 1) {
                        toastr.success(response['msg']);
                    }

                    var discount = response['discount'];
                    $("#txt_coupon_ammount").html("-₹" + parseFloat(discount).toFixed(2));

                } else if (response['type'] == 0) {
                    if (check_valid == 1) {
                        toastr.error(response['msg']);
                        $("#offercode").css("border-bottom", "1px solid #ff0000").focus();
                    }
                    $("#txt_coupon_ammount").html("-₹" + parseFloat(0).toFixed(2));                    
                }
                if(calculate_total == 1){
                    calculate_sub_total();
                }
            },
            error: function (xhr) {
                //alert(xhr.responseText);
            },
        });
    }
}
function show_ordering_for_popup() {
    $("#ordering-for-modal").modal("show");

    var name = $("#orderingforname").val();
    var mobileno = $("#orderingformobileno").val();

    $("#modal_ord_for_name").val(name);
    $("#modal_ord_for_mobile").val(mobileno);
}
function check_order_for_detail() {
    var name = $("#modal_ord_for_name").val();
    var mobileno = $("#modal_ord_for_mobile").val();
    var isvalid = 1;

    if (name == "") {
        $("#modal_ord_for_name_error").html('<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Please enter name !');
        isvalid = 0;
    } else if (name.length < 2) {
        $("#modal_ord_for_name_error").html('<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Name require min. 2 characters !');
        isvalid = 0;
    } else {
        $("#modal_ord_for_name_error").html("");
    }
    if (mobileno == "") {
        $("#modal_ord_for_mobile_error").html('<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Please enter mobile no. !');
        isvalid = 0;
    } else if (mobileno.length != 10) {
        $("#modal_ord_for_mobile_error").html('<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Mobile no. require 10 digits !');
        isvalid = 0;
    } else {
        $("#modal_ord_for_mobile_error").html("");
    }

    if (isvalid == 1) {
        $("#orderingforname").val(name);
        $("#orderingformobileno").val(mobileno);

        $("#txt_ord_for").html(name + ", " + mobileno);

        $("#ordering-for-modal").modal("hide");
    }
}
function checkout() {
    var delivery_address = $("#delivery_address1").val();
    var pincode = $("#pincode").val();
    var orderingforname = $("#orderingforname").val();
    var orderingformobileno = $("#orderingformobileno").val();
    var orderingforemail = $("#orderingforemail").val();
    var noofcartitems = $(".noofcartitems").length;
    
    var is_valid = 1;
    if (delivery_address == "" || delivery_address == undefined) {
        toastr.error("Please choose delivery location !");
        is_valid = 0;
    }
    if (orderingforname == "" || orderingformobileno == "" || orderingforemail == "") {
        toastr.error("Please enter name ,mobile no & email id. !");
        $("#listAddressModal").modal("show");
        is_valid = 0;
    }
    if (noofcartitems <= 0) {
        toastr.error("Add atleast one item in cart !");
        is_valid = 0;
    }

    if (is_valid == 1) {

        var formdata = new FormData($('#checkout_form')[0]);
        $.ajax({
            url: SITE_URL + 'cart_checkout/place-order',
            type: 'POST',
            data: formdata,
            dataType: 'json',
            beforeSend: function () {
                $('#btn-checkout').css({ 'pointer-events': 'none', 'opacity': '.3' }).prop("disabled", true).text("Please Wait...");
                $('body').css({ 'pointer-events': 'none', 'opacity': '.3' });
            },
            success: function (response) {

                if (response['type'] == 1) {
                    if (response['payment_type'] == 'online' && parseFloat(response['netamount']) > 0) {
                        $("#payment_form").append($("<input>").attr("type", "hidden").attr("name", "amount").val(parseFloat(response['netamount']).toFixed(2)));
                        $("#payment_form").append($("<input>").attr("type", "hidden").attr("name", "firstname").val(response['customer_name']));
                        $("#payment_form").append($("<input>").attr("type", "hidden").attr("name", "lastname").val(response['customer_name']));
                        $("#payment_form").append($("<input>").attr("type", "hidden").attr("name", "email").val(response['customer_email']));
                        $("#payment_form").append($("<input>").attr("type", "hidden").attr("name", "phone").val(response['customer_mobileno']));
                        $("#payment_form").append($("<input>").attr("type", "hidden").attr("name", "address1").val(delivery_address));
                        $("#payment_form").append($("<input>").attr("type", "hidden").attr("name", "transaction_id").val(response['transaction_id']));

                        $('#payment_form').submit();
                    } else {
                        toastr.success(response['msg']);
                        $('html, body').animate({ scrollTop: 0 }, 'slow');

                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    }
                } else if (response['type'] == 0) {
                    toastr.error(response['msg']);
                } else if (response['type'] == 3) {
                    toastr.error(response['msg']);
                    setTimeout(() => {
                        $(".custimisebtncart").click();
                    }, 1000);
                } else if (response['type'] == 2) {
                    $("#outsideKitchenDeliveryPopup").modal("show");
                }
                if (response['type'] != 1) {
                    $('#btn-checkout').css({ 'pointer-events': 'unset', 'opacity': '1' }).prop("disabled", false).text("Checkout");
                }
                $('body').css({ 'pointer-events': 'auto', 'opacity': '1' });
            },
            error: function (xhr) {
                //alert(xhr.responseText);
            },
            cache: false,
            contentType: false,
            processData: false
        });
    }
}
function get_offers(kitchen_id) {

    if (offer_offset == 0) {
        $("#offerCodeList").html("");
    }
    if (kitchen_id != "") {
        $.ajax({
            url: SITE_URL + 'cart_checkout/get-offers',
            type: 'POST',
            data: { kitchen_id: kitchen_id, offset: offer_offset },
            dataType: 'json',
            success: function (response) {

                var offers = response.data;
                var html = "";

                if (offers.length > 0) {

                    html += '<div class="container">';
                    for (var i = 0; i < offers.length; i++) {

                        if (offers[i]['discounttype'] == "0") {
                            var disc = parseInt(offers[i]['discount']) + "% Off."
                        } else {
                            var disc = parseInt(offers[i]['discount']) + "₹ Off."
                        }
                        html += '<div class="row offercodenewlist">\
                                    <div class="col-md-3">\
                                    <div class="holder">\
                                    <span class="vertical-text"><b>' + disc + '</b></span>\
                                    </div>\
                                </div>\
                                <div class="col-md-9" id="offermiddlesection">\
                                <div class="offermiddlesection">\
                                <img src="' + FRONT_IMAGES_URL + 'offericon.svg" alt="logo" class="left">\
                                <span><b>'+ offers[i]['offercode'] + '</b></span>\
                                <p>Use code <b>'+ offers[i]['offercode'] + '</b> & get ' + disc + ' &nbsp;&nbsp;&nbsp;&nbsp;</p>\
                                <button class="applycoupon" onclick="apply_coupon(' + offers[i]['id'] + ')"><b>APPLY COUPON</b></button>\
                                </div>\
                                </div>\
                                <input type="hidden" id="offer_code_' + offers[i]['id'] + '" value="' + offers[i]['offercode'] + '">\
                            </div>';
                    }
                    html += '</div>';
                } else {
                    html += '<div class="row"><div class="col-md-12">No offers available.</div></div>';
                }
                if (offers.length > 3) {
                    $('.scrollbaroffers').css('height', '450px');
                    $('.scrollbaroffers').css('overflow-y', 'scroll');
                    $('.scrollbaroffers').addClass('style-4');
                }
                if (parseInt(offer_offset) == 0) {
                    $("#offerCodeList").html(html);
                } else {
                    $("#offerCodeList").append(html);
                }
                offer_offset = parseInt(offer_offset) + parseInt(10);

                if (parseInt(offer_offset) >= parseInt(response.totalrows)) {
                    $("#offerCode-lmbtn").hide();
                } else {
                    $("#offerCode-lmbtn").show();
                }
            },
            error: function (xhr) {
                //alert(xhr.responseText);
            },
        });
    }
}
function tc_apply(offer_id) {
    var offer_code = $("#offer_code_" + offer_id).val();
    $('#tcModal').modal({ backdrop: 'static', keyboard: false });
    $('#tcModal').addClass('open');
    if ($('#tcModal').hasClass('open')) {
        $('#offersModal').addClass('blur');
    }
    $('#tc_close').click(function () {
        $('body').css('overflow', 'hidden');
        $('#tcModal').removeClass('open');
        $('#offersModal').removeClass('blur');
    });
    $('#offerclose').click(function () {
        $('body').css('overflow', 'visible');
    });
    $('#tcModal').modal('show');
    $("#tclist").html("");
    if (offer_id != "") {

        $.ajax({
            url: SITE_URL + 'cart_checkout/get-offers_description',
            type: 'POST',
            data: { offer_id: offer_id },
            dataType: 'json',
            // async: false,
            success: function (response) {
                $("#tclist").html(response.data.description);

            },
        });
    }
}
function apply_coupon(offer_id) {
    var offer_code = $("#offer_code_" + offer_id).val();

    $('#offercode').val(offer_code).css("border", "1px solid #ced4da");
    $('#offersModal').modal('hide');
    $('#btnApplyCoupon').click();
}