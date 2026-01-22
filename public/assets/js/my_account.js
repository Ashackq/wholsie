var oh_offset = rh_offset = ad_offset = fo_offset = 0;
var searchInput = 'address';
var intervalTime = (20 * 1000);

var order_delivery_dates_array = [];

$(document).on("change", ".makeDefaultAddress", function () {
    var status = this.checked ? 'y' : 'n';
    var address_id = $(this).attr('data-id');
    $.ajax({
        url: SITE_URL + 'userprofile/makeDefaultAddress',
        type: 'POST',
        data: {
            address_id: address_id,
            status: status
        },
        dataType: 'json',
        // async: false,
        success: function (response) {
            if (response == 1){
                $(".txt_is_delivery").val("n");
                if (status == "y") {
                    $(".makeDefaultAddress").prop("checked", false).prop("disabled", false);
                    $("#makeDefaultAddress" + address_id).prop("checked", true).prop("disabled", true);
                    
                    $("#txt_is_delivery_" + address_id).val("y");
                    
                    setTimeout(() => {
                        $(".default_address_cls").html("");
                    }, 1000);
                } else {
                    $(".default_address_cls").html("");
                }
            }
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        }
    });
});
$(document).on("click", ".wishlist_li", function () {
    fo_offset = 0;
    get_favourite_order();
});

function check_image(obj, element){
    var val = obj.val();
    var id = obj.attr('id').match(/\d+/);
    var filename = obj.val().replace(/C:\\fakepath\\/i, '');
    var filesize = obj[0].files[0].size;
    if (element == 'profile_image') { $("#removeProfileBtn").hide(); }
    
    switch(val.substring(val.lastIndexOf('.') + 1).toLowerCase()){
        case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': 
            
            $("#isvalid"+element).val(1);
            $("#lbl"+element).html(filename);
            $("#error_"+element).html("");

            if(element == 'profile_image'){
                if (obj[0].files && obj[0].files[0]) {
                    var reader = new FileReader();
                    
                    reader.onload = function(e) {
                        $('#img_'+element).attr('src', e.target.result);
                    }
                    reader.readAsDataURL(obj[0].files[0]);
                    $("#removeProfileBtn").show();
                }
            }
            break;
        default:
                
            $("#isvalid"+element).val(0);
            $("#lbl"+element).html("Choose file");
            $("#error_"+element).html("Accept only image file !");
            break;
    }
}

function load_order_history(){
    
    if($(".order_history_li").length > 0) {
        $.ajax({
            url: SITE_URL+'userprofile/load-order-history',
            type: 'POST',
            data: { offset: parseInt(oh_offset) },
            dataType: 'json',
            // async: false,
            beforeSend: function(){
                $(".oh.load_more_btn").css({'opacity':'0.3',"pointer-events":"none"}).prop("disabled",true);
                $(".oh.load_more_btn a").text('Loading...');
                if (parseInt(oh_offset) == 0) {
                    $('.ohlist').html("<div class='loading-image' style='text-align:center;width: 100%;'><img style='width: 200px;' src='" + FRONT_IMAGES_URL + "loading-please-wait.gif'></div>");
                } else {
                    $('.ohlist').append("<div class='loading-image' style='text-align:center;width: 100%;'><img style='width: 200px;' src='" + FRONT_IMAGES_URL + "loading-please-wait.gif'></div>");
                }
            },
            success: function (response) {

                $('.ohlist .loading-image').remove();

                if(parseInt(oh_offset)==0){
                    $(".ohlist").html(response.html);
                }else{
                    $(".ohlist").append(response.html);
                }
                oh_offset = parseInt(oh_offset) + parseInt(PER_PAGE_ORDER);
                
                if(parseInt(oh_offset) >= parseInt(response.totalrows)){
                    $(".oh.load_more_btn").hide();
                }else{
                    $(".oh.load_more_btn").show();
                }
            },
            error: function(xhr) {
            //alert(xhr.responseText);
            },
            complete: function(){
                $(".oh.load_more_btn").css({'opacity':'1',"pointer-events":"unset"}).prop("disabled",false);
                $(".oh.load_more_btn a").text('Load More');
            },
        });
    }
}
function load_return_history(){
    
    if($(".order_history_li").length > 0) {
        $.ajax({
            url: SITE_URL+'userprofile/load-return-history',
            type: 'POST',
            data: { offset: parseInt(rh_offset) },
            dataType: 'json',
            // async: false,
            beforeSend: function(){
                $(".rh.load_more_btn").css({'opacity':'0.3',"pointer-events":"none"}).prop("disabled",true);
                $(".rh.load_more_btn a").text('Loading...');
                if (parseInt(rh_offset) == 0) {
                    $('.rhlist').html("<div class='loading-image' style='text-align:center;width: 100%;'><img style='width: 200px;' src='" + FRONT_IMAGES_URL + "loading-please-wait.gif'></div>");
                } else {
                    $('.rhlist').append("<div class='loading-image' style='text-align:center;width: 100%;'><img style='width: 200px;' src='" + FRONT_IMAGES_URL + "loading-please-wait.gif'></div>");
                }
            },
            success: function (response) {

                $('.rhlist .loading-image').remove();

                if(parseInt(rh_offset)==0){
                    $(".rhlist").html(response.html);
                }else{
                    $(".rhlist").append(response.html);
                }
                rh_offset = parseInt(rh_offset) + parseInt(PER_PAGE_ORDER);
                
                if(parseInt(rh_offset) >= parseInt(response.totalrows)){
                    $(".rh.load_more_btn").hide();
                }else{
                    $(".rh.load_more_btn").show();
                }
            },
            error: function(xhr) {
            //alert(xhr.responseText);
            },
            complete: function(){
                $(".oh.load_more_btn").css({'opacity':'1',"pointer-events":"unset"}).prop("disabled",false);
                $(".oh.load_more_btn a").text('Load More');
            },
        });
    }
}
function get_address(){

    $.ajax({
        url: SITE_URL+'userprofile/get-address',
        type: 'POST',
        data: {offset:parseInt(ad_offset)},
        dataType: 'json',
        // async: false,
        beforeSend: function(){
            $(".ad.load_more_btn").css({'opacity':'0.3',"pointer-events":"none"}).prop("disabled",true);
            $(".ad.load_more_btn a").text('Loading...');
        },
        success: function(response){

            $(".adlistnew").append(response.html);
            //$("#adlistmobile").append(response.html);
            ad_offset = parseInt(ad_offset) + parseInt(PER_PAGE_ADDRESS);
            
            if(parseInt(ad_offset) >= parseInt(response.totalrows)){
                $(".ad.load_more_btn").hide();
            }else{
                $(".ad.load_more_btn").show();
            }                
        },
        error: function(xhr) {
        //alert(xhr.responseText);
        },
        complete: function(){
            $(".ad.load_more_btn").css({'opacity':'1',"pointer-events":"unset"}).prop("disabled",false);
            $(".ad.load_more_btn a").text('Load More');
        },
    }); 
    
}
function update_profile(){
    
    var profile_image = $("#profile_image").val();
    var validprofile_image = $("#isvalidprofile_image").val();
    var user_name = $("#user_name").val();
    var user_email = $("#user_email").val();
    var user_password = $("#user_password").val();
    var profession = $("#profession").val();
    var city = $("#city").val();
    var pincode = $("#pincode").val();
    var gender = $("#gender").val();
    var state_name = $("#state_name").val();
    
    var isvalid = 1;
    $("#error_user_form, #error_user_name, #error_user_email, #error_profile_image, #error_user_mobile, #error_user_password,#error_profession,#error_pincode,#error_state_name,#error_city, #error_gender").html("");

    if(user_name == ""){
        $("#error_user_name").html("Please enter name !");
        isvalid = 0;
    }
    if(user_email == ""){
        $("#error_user_email").html("Please enter email !");
        isvalid = 0;
    }else if(user_email != "" && !checkEmail(user_email)){
        $("#error_user_email").html("Please enter valid email address !");
        isvalid = 0;
    }
    var user_mobile = $("#user_mobile").val();

    if (user_mobile == "") {
        $("#error_user_mobile").html("Please Mobile Number !");
        isvalid = 0;
    } else if (user_mobile.length != 10) {
        $("#error_user_mobile").html('Mobile number allowed 10 digits !');
        isvalid = 0;
    }
    if(profile_image != "" && validprofile_image == 0){
        $("#error_profile_image").html("Accept only image file !");
        isvalid = 0;
    }
    if(user_password == ""){
        $("#error_user_password").html("Please enter password !");
        isvalid = 0;
    }
    if(profession == ""){
        $("#error_profession").html("Please enter profession !");
        isvalid = 0;
    }
    if(gender == ""){
        $("#error_gender").html("Please Select gender !");
        isvalid = 0;
    }
    if(pincode == ""){
        $("#error_pincode").html("Please enter pincode !");
        isvalid = 0;
    }
    if(city == ""){
        $("#error_city").html("Please enter city !");
        isvalid = 0;
    }
    if(state_name == ""){
        $("#error_state_name").html("Please enter state !");
        isvalid = 0;
    }
    
    if(isvalid){
        var formdata = new FormData($('#user_form')[0]);

        $.ajax({
            url: SITE_URL+'userprofile/ajax_request/update_account_details',
            type: 'POST',
            data: formdata,
            dataType: 'json',
            // async: false,
            success: function(response){
                var receivedData = response;
                if (receivedData.success == 1) {
                    if(receivedData.otp_sent == 1)
                    {
                        toastr.success(receivedData.message);
                        
                    }else{
                        toastr.success(receivedData.message);
                        setTimeout(() => {
                            
                            window.location.reload();
                        }, 2000); 
                    }
                } else {
                    toastr.error(receivedData.message);
                }
            },
            error: function(xhr) {
            //alert(xhr.responseText);
            },
            cache: false,
            contentType: false,
            processData: false
        });
    }
}
function get_favourite_order() {
    if($(".wishlist_li").length > 0) {
        $.ajax({
            url: SITE_URL + 'userprofile/get_favourite_order',
            type: 'POST',
            data: { offset: parseInt(fo_offset) },
            dataType: 'json',
            // async: false,
            beforeSend: function () {
                $(".fo_loadmore_btn").css({ 'opacity': '0.3', "pointer-events": "none" }).prop("disabled", true);
                $(".fo_loadmore_btn a").text('Loading...');
                if (parseInt(fo_offset) == 0) {
                    $('.favoriteorderlist').html("<div class='loading-image' style='text-align:center;width: 100%;'><img style='width: 200px;' src='" + FRONT_IMAGES_URL + "loading-please-wait.gif'></div>");
                } else {
                    $('.favoriteorderlist').append("<div class='loading-image' style='text-align:center;width: 100%;'><img style='width: 200px;' src='" + FRONT_IMAGES_URL + "loading-please-wait.gif'></div>");
                }
            },
            success: function (response) {

                $('.favoriteorderlist .loading-image').remove();

                if (parseInt(fo_offset) == 0) {
                    $(".favoriteorderlist").html(response.html);
                } else {
                    $(".favoriteorderlist").append(response.html);
                }
                fo_offset = parseInt(fo_offset) + parseInt(PER_PAGE_ORDER);

                if (parseInt(fo_offset) >= parseInt(response.totalrows)) {
                    $(".fo_loadmore_btn").hide();
                } else {
                    $(".fo_loadmore_btn").show();
                }

            },
            error: function (xhr) {
                //alert(xhr.responseText);
            },
            complete: function () {
                $(".fo_loadmore_btn").css({ 'opacity': '1', "pointer-events": "unset" }).prop("disabled", false);
                $(".fo_loadmore_btn a").text('Load More');
            },
        });
    }
}
function add_favourite_order(orderId) {
    var submitData = {};
    submitData['toRemove'] = 0;
    submitData['orderId'] = orderId;
    var submittedData = {
        'submittedData': submitData
    };
    $.ajax({
        url: SITE_URL + 'userprofile/ajax_request/favorite_order',
        datatype: 'json',
        data: submittedData,
        type: 'POST',
        success: function (response) {
            var receivedData = jQuery.parseJSON(response);
            if (receivedData.success == 1) {
                $('.fav_order_' + orderId).attr("onclick", "remove_favourite_order(\'" + orderId + "\')");
                $('.fav_order_' + orderId).attr("title", "Remove from Favourite").removeClass("fa-heart-o").addClass("fa-heart");
                toastr.success(receivedData.message);
            } else {
                toastr.error(receivedData.message);
            }
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}
function remove_favourite_order(orderId) {
    var submitData = {};
    submitData['toRemove'] = 1;
    submitData['orderId'] = orderId;
    var submittedData = {
        'submittedData': submitData
    };
    $.ajax({
        url: SITE_URL + 'userprofile/ajax_request/favorite_order',
        datatype: 'json',
        data: submittedData,
        type: 'POST',
        success: function (response) {
            var receivedData = jQuery.parseJSON(response);
            if (receivedData.success == 1) {
                $('.fav_order_' + orderId).attr("onclick", "add_favourite_order(\'" + orderId + "\')");
                $('.fav_order_' + orderId).attr("title", "Add to Favourite").removeClass("fa-heart").addClass("fa-heart-o");
                toastr.success(receivedData.message);
            } else {
                toastr.error(receivedData.message);
            }
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}
function get_wallet_balance(store_id) {
    $.ajax({
        url: SITE_URL + 'userprofile/ajax_request/get_wallet_balance',
        datatype: 'json',
        type: 'POST',
        data: {store_id: store_id},
        success: function (response) {
            var receivedData = jQuery.parseJSON(response);

            $("#cst_wallet_balance").val(parseFloat(receivedData.wallet));
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}
$('.list-rating-check input').on('click', function () {
    var ratingValue = $(this).val();
    $("#rating").val(parseInt(ratingValue));
});
function get_reviews(){
    var store_id = $("#store_id").val();
    var order_id = $("#order_id").val();

    $.ajax({
        url: SITE_URL + 'userprofile/ajax_request/get_reviews',
        type: 'POST',
        data: {offset:parseInt(review_offset), order_id: order_id, store_id: store_id},
        dataType: 'json',
        // async: false,
        beforeSend: function(){
            $(".review.load_more_btn").css({'opacity':'0.3',"pointer-events":"none"}).prop("disabled",true);
            $(".review.load_more_btn a").text('Loading...');
        },
        success: function(response){

            if(parseInt(review_offset)==0){
                $("#review_list").html(response.html);
            }else{
                $("#review_list").append(response.html);
            }
            review_offset = parseInt(review_offset) + parseInt(PER_PAGE_FEEDBACK);
            
            if(parseInt(review_offset) >= parseInt(response.totalrows)){
                $(".review.load_more_btn").hide();
            }else{
                $(".review.load_more_btn").show();
            }
            
        },
        error: function(xhr) {
        //alert(xhr.responseText);
        },
        complete: function(){
            $(".review.load_more_btn").css({'opacity':'1',"pointer-events":"unset"}).prop("disabled",false);
            $(".review.load_more_btn a").text('Load More');
        },
    });
}
function submit_review() {
    var store_id = $("#store_id").val();
    var order_id = $("#order_id").val();
    var rating = $("#rating").val();
    var review = $("#review").val();
    var isvalid = 1;

    if (rating == 0) {
        toastr.error('Please select rating !');
        isvalid = 0;
    }

    if (isvalid == 1) {
        var submitData = {};
        submitData['store_id'] = store_id;
        submitData['order_id'] = order_id;
        submitData['rating'] = rating;
        submitData['message'] = review;
        var submittedData = {
            'submittedData': submitData
        };

        $.ajax({
            url: SITE_URL + "userprofile/ajax_request/rate_order",
            type: 'POST',
            data: submittedData,
            datatype: 'json',
            beforeSend: function () {
                $('#submitReviewBtn').prop('disabled', true).text("Loading...");
            },
            success: function (response) {
                var receivedData = jQuery.parseJSON(response);
                if (receivedData.success == 1) {
                    $("#rating").val('0');
                    $("#review").val('');
                    $('.list-rating-check input').prop('checked', false);
                    toastr.success(receivedData.message);
                } else {
                    toastr.error(receivedData.message);
                }
                $('#submitReviewBtn').prop("disabled", false).text("Submit Reviews");
            },
            error: function (xhr) {
                //alert(xhr.responseText);
            }
        });
    }
}
function copyToClipboard(element) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(element).text()).select();
    document.execCommand("copy");
    $temp.remove();
    $("#copied").text("Code copied!");
}
function myFunction() {
    var x = document.getElementById("tab-control1");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}
function remove_profile_picture() {
    $("#lblprofile_image").html("Choose file");
    $("#oldprofileimage").val("");
    $("#profile_image").val("");
    $("#img_profile_image").attr("src", NOPROFILEIMAGE);
    $("#removeProfileBtn").hide();
}
function getCodeBoxElement_um(index) {
    return document.getElementById('codeBox_um' + index);
}
function onKeyUpEvent_um(index, event) {
    const eventCode = event.which || event.keyCode;
    var otp = "";
    if (getCodeBoxElement_um(index).value.length === 1) {
        if (index !== 4) {
            getCodeBoxElement_um(index + 1).focus();
        } else {
            getCodeBoxElement_um(index).blur();
            // Submit code
            $("#editprofileModal").find(".otptext").each(function() {
                if (this.value != "") {
                    otp += this.value
                }
            });
            $("#editprofileModal").find("#otp_um").val(otp);
            verify_otp_for_update_mobile();
        }
    }
    if (eventCode === 8 && index !== 1) {
        getCodeBoxElement_um(index - 1).focus();
    }
    $("#editprofileModal").find("#otp_um").val(otp);
}
function onFocusEvent_um(index) {
    for (item = 1; item < index; item++) {
        const currentElement = getCodeBoxElement_um(item);
        if (!currentElement.value) {
            currentElement.focus();
            break;
        }
    }
}
// function verify_otp_for_update_mobile() {
//     var otp = $("#editprofileModal").find("#otp_um").val().trim();
//     var isvalid = 1;

//     if (otp == '') {
//         toastr.error('Please enter otp !');
//         isvalid = 0;
//     }

//     if (isvalid) {
//         var formdata = new FormData($("#editprofileModal").find('#otpform')[0]);

//         $.ajax({
//             url: SITE_URL + 'userprofile/update_mobile',
//             type: 'POST',
//             data: formdata,
//             dataType: 'json',
//             success: function(response) {

//                 if (response == 1) {
//                     toastr.success("Profile successfully updated !");
//                     setTimeout(() => {
//                         $("#editprofileModal").find('#otpform').hide();

//                         $("#editprofileModal").modal("hide");
//                         window.location.reload();
//                     }, 2000);
//                 } else if (response == 2) {
//                     toastr.error("Please enter valid OTP !");
//                 } else if (response == 3) {
//                     toastr.error("Your OTP was expired !");
//                 } else {
//                     toastr.error("Profile not update !");
//                 }
//             },
//             error: function(xhr) {
//                 //alert(xhr.responseText);
//             },
//             cache: false,
//             contentType: false,
//             processData: false
//         });
//     }
// }
// function resend_otp_for_update_mobile() {

//     var mobile = $("#hidden_usermobile").val();

//     var isvalid = 1;
//     $("#error_update_mobile_form").html("");

//     if (isvalid) {
//         $.ajax({
//             url: SITE_URL + 'userprofile/resend_otp_for_update_mobile',
//             type: 'POST',
//             data: {mobile: mobile},
//             dataType: 'json',
//             // async: false,
//             success: function(response) {
//                 if (response > 0) {
//                     toastr.success('OTP successfully sent in your mobile.');
//                 } else {
//                     toastr.error('OTP not send !');
//                 }
//             },
//             error: function(xhr) {
//                 //alert(xhr.responseText);
//             },
//         });
//     }
// }


$(document).ready(function(){
    getUnReadChatMessageCount();

    setInterval(() => {
        getUnReadChatMessageCount();
      }, 20000);
});
$(document).on("click",".loadChat",function(){
    $(this).removeClass("loadChat");
    get_chat_messages();
});

$(document).on("click",".send_message",function(){
    send_message();
});

$(document).on("keypress", "#text_message", function(event) {
    if (event.which == 13){
        event.preventDefault();
        send_message();
    }
});

function send_message(){
    var message = $('#text_message').val();
    
    if(message == ""){ 
        toastr.error('Please enter message !');
        return;
    }

    $.ajax({
        url: SITE_URL+'userprofile/add-chat-message',
        type: 'POST',
        data: {message:message},
        dataType: 'json',
        success: function(response){
            $("#text_message").val("");
            get_chat_messages();
        },
        error: function(xhr) {
        //alert(xhr.responseText);
        },
    });
    $('#message').val('');  
}

function get_chat_messages(){
    if($(".chat_with_kitchen_li").length == 1){
        $.ajax({
            url: SITE_URL+'userprofile/get_chat_messages',
            type: 'POST',
            dataType: 'json',
            success: function(response){

                var html = "";
                
                if(response.length > 0){
                    
                    for(var i=0; i<response.length; i++){

                        if(response[i]['msg_type'] == 'foodiestokitchen'){
                            
                            html += '<div class="row message-body">\
                                        <div class="col-sm-12 message-main-sender">\
                                            <div class="sender">\
                                                <div class="message-text">'+response[i]['message']+'</div>\
                                                <div class="message-time pull-right">'+response[i]['time']+'</div>\
                                            </div>\
                                        </div>\
                                    </div>';

                        }else{
                            
                            html += '<div class="row message-body">\
                                        <div class="col-sm-12 message-main-receiver">\
                                            <div class="receiver">\
                                                <div class="message-text">'+response[i]['message']+'</div>\
                                                <div class="message-time pull-right">'+response[i]['time']+'</div>\
                                            </div>\
                                        </div>\
                                    </div>';
                            
                        }

                    }
                }

                $("#chat_conversation").html(html);
            
                $("#new_msg_count").html('');
            },
            error: function(xhr) {
            //alert(xhr.responseText);
            },
        });
        setTimeout(() => {
            get_chat_messages();
        }, 5000);
    }
}
$(document).on("click",".loadChat_mobile",function(){
    $(this).removeClass("loadChat_mobile");
    get_chat_messages_mobile();
});
$(document).on("click",".send_message_mobile",function(){
    send_message_mobile();
});
$(document).on("keypress", "#text_message_mobile", function(event) {
    if (event.which == 13){
        event.preventDefault();
        send_message_mobile();
    }
});
function send_message_mobile(){
    var message = $('#text_message_mobile').val();
    
    if(message == ""){ 
        toastr.error('Please enter message mobile!');
        return;
    }

    $.ajax({
        url: SITE_URL+'userprofile/add-chat-message',
        type: 'POST',
        data: {message:message},
        dataType: 'json',
        success: function(response){
            $("#text_message_mobile").val("");
            get_chat_messages_mobile();
        },
        error: function(xhr) {
        //alert(xhr.responseText);
        },
    });
    $('#message').val('');  
}
function get_chat_messages_mobile(){
    if($(".chat_with_kitchen_li_mobile").length == 1){
        $.ajax({
            url: SITE_URL+'userprofile/get_chat_messages',
            type: 'POST',
            dataType: 'json',
            success: function(response){

                var html = "";
                
                if(response.length > 0){
                    
                    for(var i=0; i<response.length; i++){

                        if(response[i]['msg_type'] == 'foodiestokitchen'){
                            
                            html += '<div class="row message-body">\
                                        <div class="col-sm-12 message-main-sender">\
                                            <div class="sender">\
                                                <div class="message-text">'+response[i]['message']+'</div>\
                                                <div class="message-time pull-right">'+response[i]['time']+'</div>\
                                            </div>\
                                        </div>\
                                    </div>';

                        }else{
                            
                            html += '<div class="row message-body">\
                                        <div class="col-sm-12 message-main-receiver">\
                                            <div class="receiver">\
                                                <div class="message-text">'+response[i]['message']+'</div>\
                                                <div class="message-time pull-right">'+response[i]['time']+'</div>\
                                            </div>\
                                        </div>\
                                    </div>';
                            
                        }

                    }
                }

                
                $("#chat_conversation_mobile").html(html);
            
                $("#new_msg_count").html('');
            },
            error: function(xhr) {
            //alert(xhr.responseText);
            },
        });
        setTimeout(() => {
            get_chat_messages();
        }, 5000);
    }
}
function getUnReadChatMessageCount() {

    if($(".chat_with_kitchen_li").length == 1){
        var baseurl = SITE_URL + 'userprofile/getUnReadChatMessageCount';
        $.ajax({
            url: baseurl,
            type: 'POST',
            dataType: 'json',
            success: function(response) {
                $("#unread_chat_msg_count").html((response.count > 0 ? response.count : ''));
            }
        });
    }


}
function updateRejectReason(){
    var reason_for_cancellation = $("#reason_for_cancellation").val();
    var upi_id = $("#upi_id").val();
    var id = $("#id").val();
    var image = $("#image").val();
    var valid_image = $("#isvalid_image").val();
    alert(id);
    $("#error_image").html("");

    isvalid = 1;
    if (reason_for_cancellation == '') {
        $("#returnelement").addClass("manage-error");
        toastr.error('Please enter reason for return !');
        isvalid = 0;
    } else {
        $("#returnelement").removeClass("manage-error");
    }
    
    if (isvalid == 1) {

     var formdata = new FormData($('#return_form')[0]);

        $.ajax({
            url: SITE_URL+'Order_detail/return_order_submittion',
            type: 'POST',
            data: formdata,
            dataType: 'json',
            // async: false,
            success: function (response) {
                    if(response  == 1){
                        toastr.success('Your return request submitted successfully !');
                        setTimeout(function () {
                            location.reload(true);
                        }, 2000);
                    }else{
                        if(response == 0){
                            toastr.error('Your return request Rejected !');
                        }
                        
                    }
                },
            error: function(xhr) {
            //alert(xhr.responseText);
            },
            cache: false,
            contentType: false,
            processData: false
        });
 }
}

function updateCancellationReason(){
    var reason_for_cancellation = $("#reason_for_cancellations").val();
    var upi_id = $("#upi_id").val();
    var id = $("#id").val();
    
    isvalid = 1;
    if (reason_for_cancellation == '') {
        $("#cancellelement").addClass("manage-error");
        toastr.error('Please enter reason for cancel !');
        isvalid = 0;
    } else {
        $("#cancellelement").removeClass("manage-error");
    }
    
    if (isvalid) {
     $.ajax({
        url: SITE_URL + 'Order_detail/cancel_order_submittion',
        type: 'POST',
        data: {
            reason_for_cancellation: reason_for_cancellation,
            upi_id : upi_id,
            id: id,
        },
        dataType: 'json',
        beforeSend: function () {
        },
        success: function (response) {
            if(response  == 1){
                toastr.success('Your cancel request submitted successfully !');
                setTimeout(function () {
                    location.reload(true);
                }, 2000);
            }else{
                if(response == 0){
                    toastr.error('Your cancel request Rejected !');
                }
                
            }
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
 }
}