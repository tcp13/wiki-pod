/* list management */
var articleCount = 0;
function addArticle(){
    if($("#article-input").val()){
        let articleName = $("#article-input").val().split("?")[0].split("/wiki/");
        articleName = articleName[articleName.length - 1].replace(/_/g, " ");

        // multi-lang support
        if($("#article-input").val().includes(".wikipedia")){
            let lang = $("#article-input").val().split(".wikipedia")[0].split(/[.\/]/);
            lang = lang[lang.length - 1];
            if(lang != "en"){
                articleName = "[" + lang + "] " + articleName;
            }
        }

        $("#content-list").append("<li id='article-" + articleCount + "'><span tabindex='0'>" + articleName + "</span><button type='button' onclick='removeArticle(" + articleCount + ");'>x</button></li>");
        articleCount++;
        $("#article-input").val("").focus();
        $("#search-results").empty();
    }
    $("#settings-row").show();
}

function removeArticle(count){
    $("#article-" + count).remove();
}

// input enter key support
$("#article-input").on('keypress', function (e) {
    if(e.which === 13){
        addArticle();
    }
});

// init bookData
var bookData = {};

// check for project ID in URL param and load existing project
let params = new URLSearchParams(document.location.search);
if(params.get("project") != null && params.get("title") != null){
    // update local data
    bookData = {
        project: params.get("project"),
        contentLink: "https://storage.googleapis.com/wikipedia-pod/" + params.get("project") + "/content.pdf",
        coverLink: "https://storage.googleapis.com/wikipedia-pod/" + params.get("project") + "/cover.pdf",
        pageCount: params.get("project").split("-")[0],
        title: decodeURIComponent(params.get("title"))
    };

    // display book preview
    $("#book-builder").hide();
    $("#bookPreview").attr("src", bookData.contentLink);
    $("#preview a").attr("href", bookData.contentLink);
    $("#preview").show();

    // display print description
    if(bookData.pageCount < 4){
        $("#print-desc").text("Get high-quality paperback books delivered by mail. Add more articles to meet the 4-page minimum for printing.").show();
        $("#purchase-form").hide();
    }
    if(bookData.pageCount > 799){
        $("#print-desc").text("Get high-quality paperback books delivered by mail. This project exceeds the 800-page maximum for printing.").show();
        $("#purchase-form").hide();
    }
}

// generate book
function generateBook(){
    if($("#content-list li span")){

        // show loading animation
        $("#book-builder").hide();
        $("#status h2").text("Loading...");
        $("#status").fadeIn(2000);

        var loading1 = setTimeout(displayLoading, 5000, "Retrieving content... hang tight!", false);
        var loading2 = setTimeout(displayLoading, 20000, "This might take a minute...", false);
        var loading3 = setTimeout(displayLoading, 40000, "Long articles take more time to format...", false);
        var loading4 = setTimeout(displayLoading, 60000, "Still loading...", false);
        var loading5 = setTimeout(displayLoading, 100000, "Hmm, this is taking longer than expected...", false);
        var timeout = setTimeout(displayLoading, 125000, "[Timeout] Hmm, something went wrong. Please try again later.", true);

        function doneLoading(){
            clearTimeout(loading1);
            clearTimeout(loading2);
            clearTimeout(loading3);
            clearTimeout(loading4);
            clearTimeout(loading5);
            clearTimeout(timeout);
        }

        function displayLoading(loadMessage, timeout) {
            $("#status h2").fadeOut("slow", function(){
                $("#status h2").html(loadMessage).fadeIn("slow");
            });
            if(timeout == true){
                $(".spinner").hide();
            }
        }


        // collect article names
        let articles = [];
        $("#content-list li span").each(function(){
            articles.push($(this).text().replace(/ /g, "_"));
        });

        // request options
        let optionsGenerate = {
            "url": "https://wikipedia-pod-upload-eys2j63jla-uc.a.run.app",
            "method": "POST",
            "timeout": 0,
            "headers": {
                "Content-Type": "application/json"
            },
            "data": JSON.stringify({
                "images": $("#setting-images").is(':checked'),
                "tables": $("#setting-tables").is(':checked'),
                "infobox": $("#setting-infobox").is(':checked'),
                "pages": articles
            }),
        };
        
        // send POST request
        $.ajax(optionsGenerate)
        .done(function (data) {

            // update local data
            bookData = {...bookData, ...data};

            // update URL params
            const stateObj = {project: true};
            history.pushState(stateObj, "WikiPOD", "index.html?project=" + bookData.project + "&title=" + encodeURIComponent(bookData.title));

            // display book preview
            doneLoading();
            $("#status").hide();
            $("#bookPreview").attr("src", bookData.contentLink);
            $("#preview a").attr("href", bookData.contentLink);
            $("#preview").show();

            // display print description
            if(bookData.pageCount < 4){
                $("#print-desc").text("Get high-quality paperback books delivered by mail. Add more articles to meet the 4-page minimum for printing.").show();
                $("#purchase-form").hide();
            }
            if(bookData.pageCount > 799){
                $("#print-desc").text("Get high-quality paperback books delivered by mail. This project exceeds the 800-page maximum for printing.").show();
                $("#purchase-form").hide();
            }
        })
        .fail(function () {
            doneLoading();
            $(".spinner").hide();
            $("#status h2").text("Hmm, something went wrong. Please try again later.");
        });
    }
}

// calculate pricing
function calcPricing(){

    // hide buttons and show loading
    $("#calcPricing, #addShipping, #checkout, #calcShipping").hide();
    $("#pricing-status").css("display", "inline-block");

    // if shipping address has been added
    if(bookData.address != null){
    }
    // if shipping address has not been added
    else{
    }

    // retrieve quantity
    bookData.quantity = $("#print-quantity").val();

    // request options
    let optionsCost = {
        "url": "https://wikipedia-pod-cost-eys2j63jla-uc.a.run.app",
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify(bookData),
    };
    
    // send POST request
    $.ajax(optionsCost)
    .done(function (data) {

        // update local data
        bookData = {...bookData, ...data};

        // display print cost
        $("#price-print p").text(money(bookData.printCost));
        $("#price-line, #price-print").show();

        // if shipping address has been added
        if(bookData.address != null){

            // display shipping cost and total cost
            $("#price-shipping p").text(money(bookData.shippingCost + bookData.handlingFee));
            $("#price-total p").text(money(bookData.totalCost));
            $("#price-shipping, #total-line, #price-total").show();

            // display taxes
            if(bookData.taxCost != 0){
                $("#price-tax p").text(money(bookData.taxCost));
                $("#price-tax").show();
            }

            // display checkout button
            $("#checkout").css('display', 'inline-block');

            // hide address form
            $("#addShipping, #address-form").hide();
        }

        // if shipping address has not been added
        else{

            // display add shipping button
            $("#addShipping").css('display', 'inline-block');
        }
    })
    .fail(function () {
        // if shipping address has been added
        if(bookData.address != null){
            alert("Hmm, something went wrong. Unable to retrieve shipping info for that mailing address.");
        }
        // if shipping address has not been added
        else{ 
            alert("Hmm, something went wrong. Unable to retrieve pricing.");
        }
    })
    .always(function () {
        // hide loading and show buttons
        $("#pricing-status").hide();
        $("#calcShipping").show();
        $("#calcPricing").text("Update Quantity").css("display", "inline-block");
    });
}

// add shipping
function addShipping(){
    $("#address-form, #calcShipping").show();
    $("#addShipping").hide();
}

// calculate shipping
function calcShipping(){

    // form validation
    if($("#address-street1").val() == null || $("#address-street1").val() == ""){
        alert("Hmm, something went wrong. Please add your mailing address.");
    }
    else if($("#address-city").val() == null || $("#address-city").val() == ""){
        alert("Hmm, something went wrong. Please add a city to your mailing address.");
    }
    else if($("#address-zip").val() == null || $("#address-zip").val() == ""){
        alert("Hmm, something went wrong. Please add a zip code to your mailing address.");
    }
    else if($("#address-state").val() == null || $("#address-state").val() == ""){
        alert("Hmm, something went wrong. Please add a state to your mailing address.");
    }
    else if($("#address-name").val() == null || $("#address-name").val() == ""){
        alert("Hmm, something went wrong. Please add a name to your mailing address.");
    }
    else if($("#address-phone").val() == null || $("#address-phone").val() == ""){
        alert("Hmm, something went wrong. Please add a phone number to your mailing address (we won't actually call you... it's just required for shipping purposes).");
    }
    else{
        // retrieve address
        bookData.address = {
            "city": $("#address-city").val(),
            "country_code": "US",
            "name": $("#address-name").val(),
            "phone_number": $("#address-phone").val(),
            "postcode": $("#address-zip").val(),
            "state_code": $("#address-state").val(),
            "street1": $("#address-street1").val(),
            "street2": $("#address-street2").val()
        };

        calcPricing();
    }    
}

// checkout
function checkout(){

    // hide buttons and show loading
    $("#calcPricing, #addShipping, #checkout").hide();
    $("#pricing-status").css("display", "inline-block");

    // check for free URL param
    let params = new URLSearchParams(document.location.search);
    bookData.free = false;
    if(params.get("free") != null){
        bookData.free = true;
    }

    // request options
    let optionsCheckout = {
        "url": "https://wikipedia-pod-checkout-eys2j63jla-uc.a.run.app",
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify(bookData)
    };
    
    // send POST request
    $.ajax(optionsCheckout)
    .done(function (data) {
        window.location.assign(data.checkout);
    })
    .fail(function () {
        alert("Hmm, something went wrong. Unable to checkout.");
    })
    .always(function () {
        // hide loading and show buttons
        $("#pricing-status").hide();
        $("#calcPricing").text("Update Quantity").show();
        $("#checkout").show();
    });
}

// convert int to money
function money(int){
    return "$" + (int * 0.01).toFixed(2);
}

// update search suggestions
let requestQueue = [];
$("#article-input").on("keyup", function(e){
    if(e.which != 40){
        if($("#article-input").val() != null && $("#article-input").val() != ""){
            requestQueue.push($("#article-input").val());
            if(requestQueue.length == 1){
                searchPreview();
            }
        }
        else{
            $("#search-results").empty();
        }
    }
});
function searchPreview(){
    var settings = {
        "url": "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=" + requestQueue[0],
        "method": "GET",
        "timeout": 0
    };

    // multi-lingual support
    if(requestQueue[0].includes("[")){
        let lang = requestQueue[0].split("] ")[0].replace("[", "");
        settings.url = "https://" + lang + ".wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=" + requestQueue[0].split("]_")[0];
    }

    $.ajax(settings)
    .done(function (response) {
        if($("#article-input").val() != null && $("#article-input").val() != "" && response.query != null){
            $("#search-results").empty();
            for(i=0; i<response.query.search.length; i++){
                // multi-lingual support
                if(requestQueue[0].includes("[")){
                    let lang = requestQueue[0].split("] ")[0].replace("[", "");
                    $("#search-results").append("<button onclick=\"addArticleByName('[" + lang + "] " + encodeURIComponent(response.query.search[i].title) + "')\"><div class='result-title'>" + response.query.search[i].title + "</div><div class='result-snippet'>" + response.query.search[i].snippet + "</div></button>");
                }
                else{
                    $("#search-results").append("<button onclick=\"addArticleByName('" + encodeURIComponent(response.query.search[i].title) + "')\"><div class='result-title'>" + response.query.search[i].title + "</div><div class='result-snippet'>" + response.query.search[i].snippet + "</div></button>");
                }
            }
        }
    })
    .always(function(){
        requestQueue.shift();
        if(requestQueue.length > 0){
            requestQueue = [requestQueue[requestQueue.length - 1]];
            searchPreview();
        }
    });
}

// add to list from search suggestions
function addArticleByName(articleName){
    $("#content-list").append("<li id='article-" + articleCount + "'><span tabindex='0'>" + decodeURIComponent(articleName) + "</span><button type='button' onclick='removeArticle(" + articleCount + ");'>x</button></li>");
    articleCount++;
    $("#article-input").val("").focus();
    $("#search-results").empty();
    $("#settings-row").show();
}

// keyboard support for search suggestions
$(document).on("keyup", function(e){
    if(e.which == 40){ // down arrow
        if($("#article-input").is(":focus")){ // move from input to suggestions
            $("#search-results button:first-child").focus();
        }
        else{ // progress through suggestions
            $("#search-results button:focus").next().focus();
        }
    }
    if(e.which == 38){ // up arrow
        if($("#search-results button:first-child").is(":focus")){ // move from suggestions to input
            $("#article-input").focus();
        }
        else{ // regress through suggestions
            $("#search-results button:focus").prev().focus();
        }
    }
});
$(document).on("keydown", function(e){
    if(e.which == 40 || e.which == 38){
        e.preventDefault(); // prevent page scroll with arrow keys
    }
})

