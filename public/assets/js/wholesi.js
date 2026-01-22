

function customizedDate(dateString, format) {
    var d = new Date(dateString);
    if (typeof format == "undefined") {
        format = "dddd, mmmm dS, yyyy, h:MM:ss TT";
        // format = "h Hrs MM Mins ss Secs";
    }
    return dateFormat(d, format);
}
function checkEmail(email) {
    var pattern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (pattern.test(email)) {
        return true;
    } else {
        return false;
    }
}
function isNumeric(event) {
    event = (event) ? event : window.event;
    var charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    return true;
}



$("#search-product-form").submit(function(e){
    e.preventDefault();
    var search = $("#search_product").val();
    var category = $("#search_product").attr("data-category");

    if (search != "") {
        if(category != ""){
            window.location.href = SITE_URL + "items?category_id="+category+"&search=" + search;
        }else{
            window.location.href = SITE_URL + "items?search=" + search;
        }
    } else {
        toastr.error("You must enter product name.");
    }
});
jQuery(document).ready(function () {
    toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": true,
        "progressBar": true,
        "positionClass": "toast-top-right",
        "preventDuplicates": true,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "5000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    }

});
var formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
});

function editcart(cart_id, product_id, cal_type) {
    var qty = $('#item_qty_' + cart_id).val();
    if (qty > 0) {
        $.ajax({
            url: SITE_URL + 'item-detail/editcart',
            type: 'POST',
            data: { 'cart_id': cart_id, 'product_id' : product_id, 'quantity': qty, cal_type: cal_type },
            dataType: 'json',
            // async: false,
            success: function (response) {
                if(response.status == 1){
                    toastr.success(response.message);
                    if (response.cartcount == 0) {
                        $(".cart_count_header").removeClass("base-count").html('');
                        $("#cart_icon_for_modal").attr('href', SITE_URL + 'cart_checkout');
                        $("#cart_icon_for_modal").removeAttr('data-toggle');
                        $("#cart_icon_for_modal").removeAttr('data-target');
                        $("#cart_icon_for_modal").removeAttr('onclick');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        $(".cart_count_header").addClass("base-count").html(response.cartcount);
                        $("#cart_icon_for_modal").attr('href', 'javascript:void(0)');
                        $("#cart_icon_for_modal").attr('data-toggle', 'modal');
                        $("#cart_icon_for_modal").attr('data-target', '#preorderModal');
                        $("#cart_icon_for_modal").attr('onclick', 'get_cart_items_mobile()');
                    }
                    if (page == "Checkout") {
                        calculate_menu_price(cart_id);

                    }
                    setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                }else{
                    if(cal_type == 1){
                        $('#item_qty_' + cart_id).val((parseInt(qty) - 1));
                    }else{
                        $('#item_qty_' + cart_id).val((parseInt(qty) + 1));
                    }
                    
                    toastr.error(response.message);
                }
            },
            error: function (xhr) {
                //alert(xhr.responseText);
            },
        });
    }
}

function GetYourAddress(address_id = "") {

    $("#address,#street,#landmark,#city,#state,#pincodes,#name,#mobilenumber,#email").css("border", "1px solid #ced4da");
    $("#error_address,#error_street,#error_landmark,#error_state,#error_pincode,#error_city,#error_name, #error_mobile, #error_email").html("");
    $("#error_address_form").html("");

    var address_variant = "Home";
    var street = landmark = city = state = pincode = "";
    
    if (address_id != "") {

        $.ajax({
            url: SITE_URL + 'Userprofile/getAddressDetail',
            type: 'POST',
            data: { "address_id": address_id },
            dataType: 'json',
            // async: false,
            success: function (response) {
                if (response.status) {
                    
                    address_variant = response.data.address_variant;
                    street = response.data.street;
                    landmark = response.data.landmark;
                    city = response.data.city;
                    state = response.data.state;
                    pincode = response.data.pincode;
                   

                    $("#address_id").val(address_id);
                    $("#address").val(response.data.address);
                    $("#state").val(response.data.state);
                    $("#city").val(response.data.city);
                    $("#pincodes").val(response.data.pincode);
                    $("#CreateAddressModal .modaltitle").html("Edit Address");
                    $("#CreateAddressModal #add_address").attr("onclick", "CreateYourAddress(" + address_id + ")");
                    $("#street").val(street);
                    $("#landmark").val(landmark);

                    if (address_variant == "Home") {
                        $("#home").prop("checked", true);
                    } else if (address_variant == "Friends Home") {
                        $("#friends_home").prop("checked", true);
                    } else if (address_variant == "Other") {
                        $("#other").prop("checked", true);
                    }

                }
            },
            error: function (xhr) {
               
            },
        });
    }
    else {
        $("#address_id").val("");
        $("#address").val('');
        $("#city").val("");
        $("#state").val('');
        $("#pincodes").val('');         
        $("#CreateAddressModal .modaltitle").html("Add New Address");        
        $("#CreateAddressModal #add_address").attr("onclick", "CreateYourAddress()");
        $("input[name=default-address]").prop("checked", true);
        $("#street").val(street);
        $("#landmark").val(landmark);
        $("#city").val(city);
        $("#state").val(state);
        $("#pincodes").val(pincode);
        $("#home").prop("checked", true);

    }
}

function CreateYourAddress(address_id = "") {
    $("#address,#street,#landmark,#city,#state,#pincodes,#name,#mobilenumber,#email").css("border", "1px solid #ced4da");
    $("#error_address,#error_street,#error_landmark,#error_state,#error_pincode,#error_city").html("");
    $("#error_address_form").html("");
    var address = $("#address").val();
    var address_variant = $("input[name=address_variant]:checked").val();
    var street = $("#street").val();
    var landmark = $("#landmark").val();
    var state = $("#state").val();
    var city = $("#city").val();
    var pincode = $("#pincodes").val();
    var name = $("#name").val();
    var mobilenumber = $("#mobilenumber").val();
    var email = $("#email").val();
    

    var isvalid = 1;
    if (address == "") {
        $("#error_address").html("Please select address !");
        $("#address").css("border", "1px solid #ff0000");
        isvalid = 0;
        $('#CreateAddressModal').animate({ scrollTop: 0 }, 'slow');
    }
    if (street.trim() == "") {
        $("#error_street").html("Please enter street !");
        $("#street").css("border", "1px solid #ff0000");
        isvalid = 0;
    }
    if (landmark.trim() == "") {
        $("#error_landmark").html("Please enter landmark !");
        $("#landmark").css("border", "1px solid #ff0000");
        isvalid = 0;
    }
    if (state == "") {
        $("#error_state").html("Please enter State name !");
        $("#error_state").css("border", "1px solid #ff0000");
        isvalid = 0;
        $('#CreateAddressModal').animate({ scrollTop: 0 }, 'slow');
    }
    if (city == "") {
        $("#error_city").html("Please enter City name !");
        $("#city").css("border", "1px solid #ff0000");
        isvalid = 0;
        $('#CreateAddressModal').animate({ scrollTop: 0 }, 'slow');
    }
    if (pincode == "") {
        $("#error_pincode").html("Please enter pincode !");
        $("#pincodes").css("border", "1px solid #ff0000");
        isvalid = 0;
        $('#CreateAddressModal').animate({ scrollTop: 0 }, 'slow');
    }
    if (name == "") {
        $("#error_name").html("Please enter name !");
        $("#name").css("border", "1px solid #ff0000");
        isvalid = 0;
        $('#CreateAddressModal').animate({ scrollTop: 0 }, 'slow');
    }
    if (mobilenumber == "") {
        $("#error_mobile").html("Please Enter mobilenumber !");
        $("#mobilenumber").css("border", "1px solid #ff0000");
        isvalid = 0;
        $('#CreateAddressModal').animate({ scrollTop: 0 }, 'slow');
    }
    if (email == "") {
        $("#error_email").html("Please enter email id !");
        $("#email").css("border", "1px solid #ff0000");
        isvalid = 0;
        $('#CreateAddressModal').animate({ scrollTop: 0 }, 'slow');
    }

    if (isvalid = 1) {
        //alert(pincode);
        var formdata = new FormData($('#address_form')[0]);

        $.ajax({
            url: SITE_URL + 'Userprofile/create_your_address',
            type: 'POST',
            data: formdata,
            dataType: 'json',
            // async: false,
            success: function (response) {
                // window.location.reload();
                var address_html = address_variant + ": ";
                var address_row = "";
                if (street.trim() != "" ||landmark.trim() != "") {
                    if (street.trim() != "") {
                        address_html += street + ", "; 
                        address_row += street + ", ";
                    }
                    if (landmark.trim() != "") {
                        address_html += landmark + ", ";
                        address_row += landmark + ", ";
                    }
                }
                address_html += address;
                address_row += address;

                if (response.status == 1) {
                    $("#CreateAddressModal #error_address_form").html('<div class="alert alert-success"><i class="fa fa-check"></i> Address successfully '+(address_id=="" ? "added" : "updaded")+' !</div>').css("color", "green");
                    $('#CreateAddressModal').animate({ scrollTop: 0 }, 'slow');
                    setTimeout(() => {
                        $("#CreateAddressModal").modal("hide");
                        $("#CreateAddressModal #error_address_form").html("");
                        if($('#CreateAddressModal').modal('hide')) {
                            $('body').css({'overflow': 'visible'});
                        }
                        $("#cust_current_address").val(address);
                        
                    }, 2000);
                    if (page == "My_account") {
                        ad_offset = 0;
                        $(".address-card").remove();
                        setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                    }
                    if (page == "Checkout") {
                                address_offset = 0;
                                $("#checkout_address_list").html("");
                                get_address();
                                if ($("input[name=default-address]").prop("checked") == true) {
                                    $("#makeDefaultAddress" + response.id).click();
                                    $("#delivery_address1").val(address_row);
                                }
                              setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                            }
                } else {
                    $("#CreateAddressModal #error_address_form").html('<div class="alert alert-danger"><i class="fa fa-exclamation-triangle"></i> Address not added !</div>').css("color", "red");
                }
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
function deleteAddress(address_id) {

    var is_delivery = $("#txt_is_delivery_" + address_id).val();

    if (is_delivery == "n") {
        swal({
            title: "Sure to delete this address ?",
            text: "",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonText: "No",
            confirmButtonText: "Yes",
            closeOnConfirm: false
        },
            function (isConfirm) {
                if (isConfirm) {
                    $.ajax({
                        url: SITE_URL + 'Userprofile/removeAddress',
                        type: 'POST',
                        data: { address_id: address_id },
                        dataType: 'json',
                        // async: false,
                        success: function (response) {
                            if (response == 1) {
                                $('#address_row_' + address_id).remove();
                                $('#address_row1_' + address_id).remove();
                                if (page == "address") {
                                    $('#row_' + address_id).remove();
                                }
                                if (page == "Checkout") {
                                    $('.address_section_' + address_id).remove();
                                }
                                swal.close();
                                ad_offset--;
                            } else {
                                swal({
                                    title: "Main Address can not delete.",
                                    text: "Make main another address then try to delete.",
                                    type: "error",
                                    showCancelButton: true,
                                    showConfirmButton: false,
                                    cancelButtonText: "Close",
                                },
                                    function (isConfirm) {
                                        if (isConfirm) {
                                        }
                                    });
                            }
                        },
                        error: function (xhr) {
                            //alert(xhr.responseText);
                        },
                    });
                }
            });
    } else {
        swal({
            title: "Main Address can not delete.",
            text: "Make main another address then try to delete.",
            type: "error",
            showCancelButton: true,
            showConfirmButton: false,
            cancelButtonText: "Close",
        },
            function (isConfirm) {
                if (isConfirm) {
                }
            });
    }

}


function validatePhone(complaints_phone_number) {
    var a = document.getElementById(complaints_phone_number).value;
    var filter = /[1-9]{1}[0-9]{9}/;
    if (filter.test(a)) {
        return true;
    }
    else {
        return false;
    }
}
function getCurrentDate(format = 'y-m-d'){
    var current_date = new Date();
    
    var year = current_date.getFullYear();
    var month = current_date.getMonth() + 1;
    var day = current_date.getDate();

    month = ((month < 10 ? '0' : '') + month);
    day = ((day < 10 ? '0' : '') + day);

    if (format == 'y-m-d'){
        return year + "-" + month + "-" + day;
    } else if (format == 'd-m-y') {
        return day + "-" + month + "-" + year;
    }
}

$(document).ready(function () {
    $('#mobile').keyup(function (e) {
        if (validatePhone('mobile')) {
            $("#error_mobile").html("");
            $("#mobile").css("border", "1px solid #ced4da");
        }
        else {
            $("#error_mobile").html("Please enter valid phone number !");
            $("#mobile").css("border", "1px solid #ff0000");

        }
    });
});
function remove_cart_item(cart_id) {
    swal({
        title: "Are you sure you want to remove this item?",
        text: "",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#FFA451",
        cancelButtonText: "No",
        confirmButtonText: "Yes",
        closeOnConfirm: false
    },
    function (isConfirm) {
        if (isConfirm) {
            $.ajax({
                url: SITE_URL + "item-detail/remove_cart_item",
                type: 'POST',
                data: {
                cart_id: cart_id
                },
                success: function(response) {
                    swal.close();
                    toastr.success('Item has been removed successfully from cart.');
                    
                    if (page == "Checkout") {
                        $("#cart_item_row_" + cart_id).remove();
                        if($(".cart_item_row").length > 0){
                            calculate_menu_price(cart_id);
                        }else{
                            window.location.reload();
                        }
                    }
                }
            });                
        }
    });
}




function get_product_detail(product_id){

    $.ajax({
        url: SITE_URL + "items/get_product_detail",
        type: 'POST',
        data: { product_id: product_id },
        dataType: 'json',
        success: function(response) {
            
            var html = '<div class="tf-product-media-wrap">\
                            <div dir="ltr" class="swiper tf-single-slide">\
                                <div class="swiper-wrapper" >\
                                    <div class="swiper-slide">\
                                        <div class="item">\
                                            <img src="' + response.data.image + '" data-src="' + response.data.image + '" alt="image-product">\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>\
                        </div>\
                        <div class="tf-product-info-wrap position-relative">\
                            <div class="tf-product-info-list">\
                                <div class="tf-product-info-title">\
                                    <h5><a class="link" href="'+SITE_URL+'/item-detail/'+response.data.id+'">' + response.data.item_name + '</a></h5>\
                                </div>\
                                <div class="tf-product-info-badges">\
                                    <div class="badges text-uppercase">Best seller</div>\
                                    <div class="product-status-content">\
                                        <i class="icon-lightning"></i>\
                                        <p class="fw-6">Selling fast! 48 people have this in their carts.</p>\
                                    </div>\
                                </div>\
                                <div class="tf-product-info-price">\
                                    <div class="price">' + formatter.format(response.data.item_price) + '</div>\
                                </div>\
                                <div class="tf-product-description">\
                                    <p>' + response.data.description + '</p>\
                                </div>\
                                <div class="tf-product-info-variant-picker">\
                                    <div class="variant-picker-item">\
                                        <div class="variant-picker-label">\
                                            Color: <span class="fw-6 variant-picker-label-value">Blue</span>\
                                        </div>\
                                        <div class="variant-picker-values">\
                                            <input id="values-blue-1" type="radio" name="color-1" checked>\
                                            <label class="hover-tooltip radius-60" for="values-blue-1" data-value="Blue">\
                                                <span class="btn-checkbox bg-color-blue"></span>\
                                                <span class="tooltip">Blue</span>\
                                            </label>\
                                            <input id="values-black-1" type="radio" name="color-1">\
                                            <label class=" hover-tooltip radius-60" for="values-black-1" data-value="Black">\
                                                <span class="btn-checkbox bg-color-black"></span>\
                                                <span class="tooltip">Black</span>\
                                            </label>\
                                            <input id="values-white-1" type="radio" name="color-1">\
                                            <label class="hover-tooltip radius-60" for="values-white-1" data-value="White">\
                                                <span class="btn-checkbox bg-color-white"></span>\
                                                <span class="tooltip">White</span>\
                                            </label>\
                                        </div>\
                                    </div>\
                                </div>\
                                <div class="tf-product-info-quantity">\
                                    <div class="quantity-title fw-6">Quantity</div>\
                                    <div class="wg-quantity">\
                                        <span class="btn-quantity minus-btn">-</span>\
                                        <input type="text" name="number" value="1">\
                                        <span class="btn-quantity plus-btn">+</span>\
                                    </div>\
                                </div>\
                                <div class="tf-product-info-buy-button">\
                                    <form class="">\
                                        <a href="javascript:void(0);" class="tf-btn btn-fill justify-content-center fw-6 fs-16 flex-grow-1 animate-hover-btn btn-add-to-cart"><span>Add to cart -&nbsp;</span><span class="tf-qty-price">₹3,500.00</span></a>\
                                        <a href="javascript:void(0);" class="tf-product-btn-wishlist hover-tooltip box-icon bg_white wishlist btn-icon-action">\
                                            <span class="icon icon-heart"></span>\
                                            <span class="tooltip">Add to Wishlist</span>\
                                            <span class="icon icon-delete"></span>\
                                        </a>\
                                    </form>\
                                </div>\
                            </div>\
                        </div>';

                $("#product_view_modal #productdata").html(html);     
                $("#product_view_modal").modal("show");     
            
        }
    });      
}
function wishlist_product(product_id) {
    $(".wishlist_product_"+product_id).css({ "pointer-events": "none", "opacity": ".5" });
    $.ajax({
        url: SITE_URL + 'items/wishlist_product',
        type: 'POST',
        data: { product_id: product_id },
        dataType: 'json',
        success: function (response) {
            if(response.status){
                toastr.success(response.message);
                $(".wishlist_product_"+product_id).attr({ "onclick": "remove_wishlist_product("+product_id+")", "title": "Remove to Wishlist" }).html('<span class="tooltip">Remove to Wishlist</span><span class="icon icon-delete" style="display:block;"></span>');
                 $(".wishlist_count_header").html(response.wishlistcount);
                $(".wishlist_count_header").addClass("base-count");
            }else{
                toastr.error(response.message);
                $("#login").modal("show");
            }
            $(".wishlist_product_"+product_id).css({ "pointer-events": "unset", "opacity": "1" });
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}
function remove_wishlist_product(product_id) {
    
    $(".wishlist_product_"+product_id).css({ "pointer-events": "none", "opacity": ".5" });

    $.ajax({
        url: SITE_URL + 'items/remove_wishlist_product',
        type: 'POST',
        data: { product_id: product_id },
        dataType: 'json',
        success: function (response) {
            if(response.status){
                toastr.success(response.message);
                $(".wishlist_product_"+product_id).attr({ "onclick": "wishlist_product("+product_id+")", "title": "Add to Wishlist" }).html('<span class="icon icon-heart" style="display:block;"></span><span class="tooltip">Add to Wishlist</span>');
                $(".wishlist_count_header").html(response.wishlistcount);
                $(".wishlist_count_header").addClass("base-count");
                $(".remove_wishlist_product_"+product_id).remove();
            }else{
                toastr.error(response.message);
            }
            $(".wishlist_product_"+product_id).css({ "pointer-events": "unset", "opacity": "1" });
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}