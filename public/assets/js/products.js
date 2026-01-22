var product_offset = 0;
$(document).ready(function () {
    get_products();
});
function get_products() {
    $.ajax({
        url: SITE_URL + 'items/get_products',
        type: 'POST',
        data: {
            offset: product_offset,
            main_category_id: main_category_id,
            category_id: category_id,
            search: $("#search-product-form").find("#search_product").val(),
        },
        dataType: 'json',
        beforeSend: function () {
        },
        success: function (response) {
            var totalrows = response.totalrows;
            var html = response.html;

            if (parseInt(product_offset) == 0) {
                $(".productsList").html(html);
            } else {
                $(".productsList").append(html);
            }
            product_offset = parseInt(product_offset) + parseInt(PER_PAGE_PRODUCTS);

            if (parseInt(product_offset) >= parseInt(totalrows)) {
                $("#productslmbtn").hide();
            } else {
                $("#productslmbtn").show();
            }
        },
        error: function (xhr) {
            //alert(xhr.responseText);
        },
    });
}