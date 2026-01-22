function search_kitchen(){
    var search = $("#search_kitchen").val().trim();
    if (search != ""){
        window.location.href = SITE_URL + "search/" + search;
    }else{
        alert("You Must Enter Your favorite Kitchen Or Food.");
    }
}
$(document).on("keypress", "#search_kitchen", function (event) {
    if (event.which == 13) {
        event.preventDefault();
        search_kitchen();
    }
});