var tableNumber = null;
AFRAME.registerComponent("markerhandler", {
  init: async function () {
    if (tableNumber === null) {
      this.askTableNumber();
    }
    var dishes = await this.getDishes();
    this.el.addEventListener("markerFound", () => {
      var markerid = this.el.id;
      console.log("marker found");
      this.handleMarkerFound(dishes, markerid);
    });
    this.el.addEventListener("markerLost", () => {
      console.log("marker lost");
      this.handleMarkerLost();
    });
  },

  askTableNumber: function () {
    var iconUrl =
      "https://raw.githubusercontent.com/whitehatjr/menu-card-app/main/hunger.png";
    swal({
      title: "Welcome To Hunger",
      icon: iconUrl,
      content: {
        element: "input",
        attributes: {
          placeHolder: "Type your table number",
          type: "number",
          min: 1,
        },
      },
      closeOnClickOutside: false,
    }).then((inputValue) => {
      tableNumber = inputValue;
    });
  },

  getDishes: async function () {
    return await firebase
      .firestore()
      .collection("dishes")
      .get()
      .then((snap) => {
        return snap.docs.map((doc) => doc.data());
      });
  },

  handleMarkerFound: function (dishes, markerid) {
    var todaysDay = new Date().getDay();
    var days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    var dish = dishes.filter((dish) => dish.id === markerid)[0];
    console.log(dish.id);
    if (dish.unavailable_days.includes(days[todaysDay])) {
      swal({
        icon: warning,
        title: dish.dish_name.toUpperCase(),
        text: "This Dish is Not Available Today",
        timer: 2500,
        buttons: false,
      });
    } else {
      var model = document.querySelector(`#model-${dish.id}`);
      model.setAttribute("position", dish.model_geometry.position);
      model.setAttribute("rotation", dish.model_geometry.rotation);
      model.setAttribute("scale", dish.model_geometry.scale);

      //Update UI conent VISIBILITY of AR scene(MODEL , INGREDIENTS & PRICE)
      model.setAttribute("visible", true);

      var ingredientsContainer = document.querySelector(
        `#main-plane-${dish.id}`
      );
      ingredientsContainer.setAttribute("visible", true);
      console.log(dish.id);
      var priceplane = document.querySelector(`#price-plane-${dish.id}`);
      priceplane.setAttribute("visible", true);
      var ratingplane = document.querySelector(`#rating-plane-${dish.id}`);
      ratingplane.setAttribute("visible", true);
      var reviewplane = document.querySelector(`#review-plane-${dish.id}`);
      reviewplane.setAttribute("visible", true);

      //Changing button div visibility
      var buttonDiv = document.getElementById("button-div");
      buttonDiv.style.display = "flex";

      var ratingButton = document.getElementById("rating-button");
      var orderButton = document.getElementById("order-button");
      var buttonDiv = document.getElementById("button-div");
      buttonDiv.style.display = "flex";
      var ratingButton = document.getElementById("rating-button");
      var orderButton = document.getElementById("order-button");
      var payButton = document.getElementById("pay-button");
      payButton.addEventListener("click", () => this.handlePayment());
      ratingButton.addEventListener("click", () => {
        this.handleRating(dish);
      });

      var orderSummaryButton = document.getElementById("order-summary-button"); //spelling correction getElementsById corrected
      orderSummaryButton.addEventListener("click", () =>
        this.handleOrderSummary()
      );
      ratingButton.addEventListener("click", function () {
        swal({
          icon: "warning",
          title: "Rate Dish",
          text: "WORK IN PROGRESS",
        });
      });
      orderButton.addEventListener("click", () => {
        var tNumber;
        tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
        this.handleOrder(tNumber, dish);
        swal({
          icon: "https://i.imgur.com/4NZ6uLY.jpg",
          title: "THANKS FOR ORDERING",
          text: "YOUR ORDER WILL SOON BE SERVED",
        });
      });
    }
  },

  handleRating: async function (dish) {
    var tNumber;
    tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
    var orderSummary = await this.getOrderSummary(tNumber);
    var currentOrders = Object.keys(orderSummary.current_orders);
    if (currentOrders.length > 0) { //corrected to currentOrders
      document.getElementById("rating-modal-div").style.display = "flex";
      document.getElementById("rating-input").value = "0";
      document.getElementById("feedback-input").value = "";
      var saveRatingButton = document.getElementById("save-rating-button");
      saveRatingButton.addEventListener("click", () => {
        document.getElementById("rating-modal-div").style.display = "none";
        var rating = document.getElementById("rating-input").value;
        var feedback = document.getElementById("feedback-input").value;
        firebase
          .firestore()
          .collection("dishes")
          .doc(dish.id)
          .update({
            last_review: feedback,
            last_rating: rating,
          })
          .then(() => {
            swal({
              icon: "success",
              title: "thank you for rating!",
              text: "we hope you liked the dish!",
              timer: 2500,
              buttons: false,
            });
          });
      });
    } else {
      swal({
        icon: "warning",
        title: "oops",
        text: "No dish found to add rating",
        timer: 2500,
        buttons: false,
      });
    }
  },

  handlePayment: function () {
    // Close Modal
    document.getElementById("modal-div").style.display = "none";

    // Getting Table Number
    var tNumber;
    tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;

    //Reseting current orders and total bill
    firebase
      .firestore()
      .collection("tables")
      .doc(tNumber)
      .update({
        current_orders: {},
        total_bill: 0,
      })
      .then(() => {
        swal({
          icon: "success",
          title: "Thanks For Paying !",
          text: "We Hope You Enjoyed Your Food !!",
          timer: 2500,
          buttons: false,
        });
      });
  },

  handleOrderSummary: async function () {
    var tNumber;
    tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
    var orderSummary = await this.getOrderSummary(tNumber);
    var modalDiv = document.getElementById("modal-div");
    modalDiv.style.display = "flex";
    var tableBodyTag = document.getElementById("bill-table-body");
    tableBodyTag.innerHTML = "";
    var currentOrders = Object.keys(orderSummary.current_orders);
    currentOrders.map((i) => {
      var tr = document.createElement("tr");
      var item = document.createElement("td");
      var quantity = document.createElement("td");
      var subTotal = document.createElement("td");
      var price = document.createElement("td");
      item.innerHTML = orderSummary.current_orders[i].item;
      price.innerHTML = orderSummary.current_orders[i].price;
      price.setAttribute("class", "text-center");
      quantity.innerHTML = orderSummary.current_orders[i].quantity;
      quantity.setAttribute("class", "text-center");
      subTotal.innerHTML = orderSummary.current_orders[i].subtotal;
      subTotal.setAttribute("class", "text-center");
      tr.appendChild(item);
      tr.appendChild(price);
      tr.appendChild(quantity);
      tr.appendChild(subTotal);
      tableBodyTag.appendChild(tr);
      var totalTr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.setAttribute("class", "no-line");
      var td2 = document.createElement("td");
      td2.setAttribute("class", "no-line");
      var td3 = document.createElement("td");
      td3.setAttribute("class", "no-line text-center");
      var strongTag = document.createElement("strong");
      strongTag.innerHTML = "Total";
      td3.appendChild(strongTag);
      var td4 = document.createElement("td");
      td4.setAttribute("class", "no-line text-center");
      td4.innerHTML = "$" + orderSummary.total_bill;
      totalTr.appendChild(td1);
      totalTr.appendChild(td2);
      totalTr.appendChild(td3);
      totalTr.appendChild(td4);
    });
  },

  getOrderSummary: async function (tNumber) {
    return await firebase
      .firestore()
      .collection("tables")
      .doc(tNumber)
      .get()
      .then((doc) => doc.data());
  },
  handleOrder: function (tNumber, dish) {
    firebase
      .firestore()
      .collection("tables")
      .doc(tNumber)
      .get()
      .then((doc) => {
        var details = doc.data();
        console.log(doc.data());
        if (details["current_orders"][dish.id]) {
          details["current_orders"][dish.id]["quantity"] += 1; //missing line added

          //Calculating Subtotal of item
          var currentQuantity = details["current_orders"][dish.id]["quantity"]; //missing line added
          details["current_orders"][dish.id]["subtotal"] =
            currentQuantity * dish.price;
        } else {
          details["current_orders"][dish.id] = {
            item: dish.dish_name,
            price: dish.price,
            quantity: 1,
            subtotal: dish.price * 1,
          };
          details.total_bill += dish.price;
          firebase.firestore().collection("tables").doc(doc.id).update(details);
        }
      });
  },

  handleMarkerLost: function () {
    var buttonDiv = document.getElementById("button-div");
    buttonDiv.style.display = "none";
  },
});
