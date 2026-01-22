$(document).ready(function(){
    /* var is_variant = $('#is_variant').val();
    if(is_variant == 'y'){
        check_combination();
    } */
   totalPriceVariant();
    $(".btn-increase").on("click", function () {
        var currentQuantity = parseInt($("#qty").val());
       
        
    });

    $(".btn-decrease").on("click", function () {
        var currentQuantity = parseInt($("#qty").val());
        if (currentQuantity > 1) {
            
        }
    });
})
$(document).on("change", ".attr_option", function(){
    var product_variant_d =  $(this).attr("id").split("_")[2];
    get_variant_option(product_variant_d, this.value);
});

var totalPriceVariant = function () {

    var basePrice = parseFloat($(".price-on-sale").data("base-price")) || parseFloat($(".price-on-sale").text().replace("₹", ""));
    var quantityInput = $(".quantity-product");
    // quantityInput.on("keydown keypress input", function(event) {
    //   event.preventDefault();
    // });
    /* $(".color-btn, .size-btn").on("click", function () {
      var newPrice = parseFloat($(this).data("price")) || basePrice;
      quantityInput.val(1);
      $(".price-on-sale").text("₹" + newPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
      var totalPrice = newPrice;
      $(".total-price").text("₹" + totalPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    }); */

    $(".btn-increase").on("click", function () {
      var currentQuantity = parseInt(quantityInput.val());
      quantityInput.val(currentQuantity + 1);
      updateTotalPrice();
    });

    $(".btn-decrease").on("click", function () {
      var currentQuantity = parseInt(quantityInput.val());
      if (currentQuantity > 1) {
        quantityInput.val(currentQuantity - 1);
        updateTotalPrice();
      }
    });

    function updateTotalPrice() {
      var currentPrice = parseFloat($(".price-on-sale").text().replace("₹", ""));
      var quantity = parseInt(quantityInput.val());
      var totalPrice = currentPrice * quantity;
      $(".total-price").text("₹" + totalPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    }

  };
function get_variant_option(product_variant_d, current_option_id) {

    $.ajax({
        url: SITE_URL + 'item-detail/get_variant_option',
        type: 'POST',
        data: {
            product_id: $("#product_id").val(),
            current_option_id: current_option_id
        },
        dataType: 'json',
        beforeSend: function () {
            $(".product-section").css({"opacity": ".5", "pointer-events" : "none"});
        },
        success: function (response) {
            var variantid = response.variantid;
            if(variantid.length > 0){                
                $(".attr_option").each(function(){
                    var id = $(this).attr("id");
                    if(variantid.includes(this.value)){
                        $("#label_" + id).css({"opacity": "1", "outline": "0px"});
                        $("#" + id).addClass("valid_option");
                    }else{
                        $("#" + id).prop("checked", false).removeClass("valid_option");
                        $("#label_" + id).css({"opacity": ".2", "outline": "1px dashed #000000"});
                    }
                });
                $(".attr_option.valid_option").each(function(){
                    var id = $(this).attr("id");
                    var attrid =  $("#" + id).data("attrid");
                    
                    if($("input[name='attr_option_"+attrid+"']:checked").length == 0 && current_option_id != this.value){
                        $("#" + id).prop("checked", true);
                    }
                    if(current_option_id == this.value){
                        $("#" + id).prop("checked", true);
                    }
                });
            }
            check_combination(product_variant_d, current_option_id);
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}
function check_combination(product_variant_d, current_option_id) {

    var option_id = [];
    $(".attr_option:checked").each(function(){
        option_id.push(this.value);
    });
    
    $("#error_variant").html('');

    $.ajax({
        url: SITE_URL + 'item-detail/check_combination',
        type: 'POST',
        data: {
            product_id: $("#product_id").val(),
            option_id: option_id,
            qty: $("#qty").val(),
            current_option_id: current_option_id
        },
        dataType: 'json',
        beforeSend: function () {
            $(".product-section").css({"opacity": ".5", "pointer-events" : "none"});
        },
        success: function (response) {
            if(response.status){
                $("#text_base_price").html(formatter.format(response.data.base_price));
                $("#text_sale_price").html(formatter.format(response.data.sale_price));
                $("#product_price").val(parseFloat(response.data.sale_price).toFixed(2));
                $("#price_id").val(response.data.price_id);
                
                if(parseFloat(response.data.discount) > 0){
                    $("#text_base_price").show();
                    $("#text_discount").show().html(response.data.discount_text);
                }else{
                    $("#text_base_price").hide();
                    $("#text_discount").hide().html('');
                }
                $("#btnAddToCart").prop("disabled", false).css({"opacity": "1"});
            
                if(response.data.variant_images.length > 0){
                    var thumbs_html = images_html = '';
                    for(var i = 0; i < response.data.variant_images.length; i++){
                        
                        thumbs_html += '<div class="swiper-slide thumb-slide cursor-pointer '+ (i==0 ? "active-thumb" : "") +'">\
                                            <div class="item">\
                                                <img class="lazyload" width="100px" data-src="'+ response.data.variant_images[i] +'" src="'+ response.data.variant_images[i] +'" alt="img-product">\
                                            </div>\
                                        </div>';
                        
                        images_html += '<div class="carousel-item '+ (i==0 ? "active" : "") +'" data-bs-slide-to="'+ i +'">\
                                            <img data-zoom="'+ response.data.variant_images[i] +'" data-src="'+ response.data.variant_images[i] +'" src="'+ response.data.variant_images[i] +'" class="d-block w-100" alt="img-product">\
                                        </div>';

                    }

                    $("#thumbs-swiper .swiper-wrapper").html(thumbs_html);
                    
                    $("#gallery-swiper .carousel-inner").html(images_html);     
                    
                    let carousel = document.getElementById("gallery-swiper");
                    let carouselInstance = new bootstrap.Carousel(carousel);
                    
                    function updateActiveThumbnail() {
                        let activeItem = document.querySelector(".carousel-item.active");
                        if (!activeItem) return;
                        let activeIndex = [...document.querySelectorAll(".carousel-item")].indexOf(activeItem);
                        let slides = document.querySelectorAll(".swiper-slide");
                        slides.forEach((slide, i) => {
                            slide.classList.toggle("active-thumb", i === activeIndex+1);
                        });
                        /* if (thumbsSwiper && activeIndex >= 0) {
                            thumbsSwiper.slideTo(activeIndex);
                        } */
                    }
                    // Update Swiper Thumbnails on Carousel Slide
                    carousel.addEventListener("slid.bs.carousel", updateActiveThumbnail);

                    // Click on Thumbnail to Change Carousel Slide
                    document.querySelectorAll(".swiper-slide").forEach((slide, index) => {
                        slide.addEventListener("click", function () {
                            carouselInstance.to(index-1);
                            updateActiveThumbnail();
                            console.log("asd")
                        });
                    });

                    // Set initial highlight
                    updateActiveThumbnail();
                }
            }
            $(".product-section").css({"opacity": "1", "pointer-events" : "auto"});
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}
function check_pincode(){
    var pincode = $("#pincode").val();
    var product_id = $("#product_id").val();
    var price_id = $("#price_id").val();

    var isvalid = 1;
    if (pincode == '') {
        $("#pincode").css("border", "1px solid #ff0000");
        toastr.error('Please enter pincode !');
        isvalid = 0;
    } else if (pincode.length != 6) {
        $("#pincode").css("border", "1px solid #ff0000");
        toastr.error('Please enter 6 digit pincode !');
        isvalid = 0;
    } else {
        $("#pincode").css("border", "1px solid var(--line-3)");
    }
    if (isvalid) {
        $.ajax({
            url: SITE_URL + 'item_detail/check_delivery_pincode',
            type: 'POST',
            data: {
                pincode: pincode,
                product_id: product_id,
                price_id: price_id,
            },
            dataType: 'json',
            beforeSend: function () {
            },
            success: function (response) {
                if(response.status == 1){
                    $('#deliveryexpected').css({ 'display': 'block' });
                    $('#deliveryday').html(response.delivery_estimate);
                    $('#text_sale_price').html(CURRENCY + response.sales_price);
                    $('#product_price').val(response.sales_price);
                    
                    if(response.is_pincode_discount == 1){
                        $('#text_base_price').hide();
                        $('#text_discount').hide();
                    }else{
                        if(response.is_product_discount == 1){
                            $('#text_base_price').html(CURRENCY + response.base_price).show();                            
                            if(response.discount_type == "p"){
                                var discount_text = response.product_discount < 100  ? (response.product_discount + "% Off") : "Free";
                            }else{
                                var discount_text = response.product_discount < response.base_price  ? ("₹" + response.product_discount + " Off") : "Free";
                            }
                            $('#text_discount').html(discount_text).show();
                        }
                    }
                }else{
                    toastr.error(response.message);
                }
            },
            error: function (xhr) {
                //alert(xhr.responseText);
            },
        });
    }
}
$(document).on("mouseover", ".color-btn", function(){
    var image = $(this).data("image");

    if(image != ""){
        $("#gallery-swiper .carousel-item").removeClass("active");
        $("#gallery-swiper .hover-color-images").remove();
        $("#gallery-swiper .carousel-inner").prepend('<div class="carousel-item hover-color-images active" data-bs-slide-to="0">\
                    <img data-zoom="'+image+'" data-src="'+image+'" src="'+image+'" class="d-block w-100" alt="img-product">\
                </div>');
    
        $("#thumbs-swiper .swiper-wrapper").prepend('<div class="swiper-slide thumb-slide cursor-pointer active-thumb hover-color-images" style="display:none;">\
                    <div class="item">\
                        <img class="lazyload" width="100px" data-src="'+image+'" src="'+image+'" alt="img-product">\
                    </div>\
                </div>');
    }
});
$(document).on("mouseout", ".color-btn", function(){
    $("#gallery-swiper .hover-color-images").remove();
    $("#thumbs-swiper .hover-color-images").remove();
    $("#gallery-swiper .carousel-item:first").addClass("active");
    $("#thumbs-swiper .swiper-slide:first").addClass("active-thumb");
});
function add_to_cart(product_id, cal_type = 1, action = '') {
    
    var qty = $('#qty').val();
    var is_variant = $('#is_variant').val();
    var price_id = "";
    var option_id = [];
    
    var btn_element = (action == 1 ? 'btn-buy-now' : 'btn-add-to-cart');

    if(is_variant == 'y'){
        $(".attr_option:checked").each(function(){
            option_id.push(this.value);
        });

        var price_id = $('#price_id').val();
        $("#error_variant").html("");
        if(price_id == ""){
            $("#error_variant").fadeIn(100).html("Variant combination does not match.");
            toastr.error("Variant combination does not match.");
            return false;
        }
    }


    $('.' + btn_element).css({ 'pointer-events': 'none', 'opacity': '.5' }).prop("disabled", true).text("Loading...");

    $.ajax({
        url: SITE_URL + 'item-detail/addtocart',
        type: 'POST',
        data: { 'product_id': parseInt(product_id), price_id: price_id, option_id: option_id, 'quantity': qty, cal_type: cal_type },
        dataType: 'json',
        success: function (response) {
            if (response.status == 1) {
                if (response.cartcount == 0) {
                    $(".cart_count_header").html('<img src="'+SITE_URL+'/assets/images/cart_black.svg" alt="cart" class="img-fluid">');
                    toastr.success(response.message);
                }else{
                    $(".cart_count_header").html('<img src="'+SITE_URL+'/assets/images/cart_black.svg" alt="cart" class="img-fluid"></i><span class="count-box">' + response.cartcount + '</span>');  
                    $(".tf-toolbar-bottom .cart_count_header").html('<img src="'+SITE_URL+'/assets/images/cart_black.svg" alt="cart" class="img-fluid"></i><div class="toolbar-count"><span class="count-box">' + response.cartcount + '</span></div>');  
                    toastr.success(response.message);
                }
                if(action == 1) {
                    window.location.href = SITE_URL + 'cart_checkout';
                }
            } 
            else {
                toastr.error(response.message);
            }
            $('.' + btn_element).css({ 'pointer-events': 'auto', 'opacity': '1' }).prop("disabled", false).text((action == 1 ? "Buy Now" : "Add to Cart"));
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}