let Cart = {};

let userID= "Set_By_Cookie_Or_Manually";
let CartSetItemsEndpoint = "/cart/setItems/" + userID;
let CartGetItemsEndpoint = "/cart/getItems/" + userID;

Cart.on = (eventName, callback) => {
    if (!Cart.callbacks[eventName]) Cart.callbacks[eventName] = [];
    Cart.callbacks[eventName].push(callback);
    return Cart;
};

Cart.trigger = (eventName, args) => {
    if (Cart.callbacks[eventName]) {
        for (let i = 0; i < Cart.callbacks[eventName].length; i++) {
            Cart.callbacks[eventName][i](args || {});
        }
    }
    return Cart;
};

Cart.save = () => {
    $.ajax({
        url: CartSetItemsEndpoint,
        data: JSON.stringify(Cart.items),
        contentType: false,
        processData: false,
        type: "POST",
        success: () => {
            Cart.trigger('saved');
            return Cart;
        },
        error: (xhr, ajaxOptions, thrownError) => {
            console.log("[CartJS] An error occured when we contacted the server to set the cart")
            console.log("[CartJS] : " + xhr.status)
            console.log("[CartJS] : " + thrownError)
        }
    });
};

Cart.empty = () => {
    Cart.items = [];
    Cart.trigger('emptied');
    Cart.save();
    return Cart;
};

Cart.indexOfItem = (id) => {
    for (let i = 0; i < Cart.items.length; i++) {
        if (Cart.items[i].id === id) return i;
    }
    return null;
};

Cart.removeEmptyLines = () => {
    newItems = [];
    for (let i = 0; i < Cart.items.length; i++) {
        if (Cart.items[i].quantity > 0) newItems.push(Cart.items[i]);
    }
    Cart.items = newItems;
    return Cart;
}


Cart.addItem = (item) => {
    if (!item.quantity) item.quantity = 1;
    let index = Cart.indexOfItem(item.id);
    if (index === null) {
        Cart.items.push(item);
    } else {
        Cart.items[index].quantity += item.quantity;
    }
    Cart.removeEmptyLines();
    if (item.quantity > 0) {
        Cart.trigger('added', {item: item});
    } else {
        Cart.trigger('removed', {item: item});
    }
    Cart.save();
    return Cart;
}


Cart.itemsCount = () => {
    let accumulator = 0;
    for (let i = 0; i < Cart.items.length; i++) {
        accumulator += Cart.items[i].quantity;
    }
    return accumulator;
}


Cart.currency = '&pound;';

Cart.displayPrice = (price) => {
    if (price === 0) return 'Free';
    let floatPrice = price / 100;
    let decimals = floatPrice == parseInt(floatPrice, 10) ? 0 : 2;
    return Cart.currency + floatPrice.toFixed(decimals);
}


Cart.linePrice = (index) => {
    return Cart.items[index].price * Cart.items[index].quantity;
}


Cart.subTotal = () => {
    let accumulator = 0;
    for (let i = 0; i < Cart.items.length; i++) {
        accumulator += Cart.linePrice(i);
    }
    return accumulator;
}


Cart.init = () => {
    $.ajax({
        url: CartGetItemsEndpoint,
        type: "GET",
        success: (items) => {
            if (items) {
                Cart.items = JSON.parse(items);
            } else {
                Cart.items = [];
            }
            Cart.callbacks = {};
            return Cart;
        },
        error: (xhr, ajaxOptions, thrownError) => {
            console.log("[CartJS] An error occured when we contacted the server to get the cart")
            console.log("[CartJS] : " + xhr.status)
            console.log("[CartJS] : " + thrownError)
        }
    });
}

Cart.initJQuery = () => {

    Cart.init();

    Cart.templateCompiler = (a, b) => {
        return (c, d) => {
            return a.replace(/#{([^}]*)}/g, (a, e) => {
                    return ("x", "with(x)return " + e).call(c, d || b || {})
                }
            )
        }
    }

    Cart.lineItemTemplate = "<tr>" +
        // "<td><img src='#{this.image}' alt='#{this.label}' /></td>" +
        "<td></td>" +
        "<td>#{this.label}</td>" +
        "<td><button type='button' class='cart-add' data-id='#{this.id}' data-quantity='-1'>-</button>#{this.quantity}<button type='button' class='cart-add' data-id='#{this.id}' data-quantity='1'>+</button></td>" +
        "<td>&times;</td>" +
        "<td>#{Cart.displayPrice(this.price)}</td>" +
        "</tr>";

    $(document).on('click', '.cart-add', (e) => {
            e.preventDefault();
            let button = $(this);
            let item = {
                id: button.data('id'),
                price: button.data('price'),
                quantity: button.data('quantity'),
                label: button.data('label'),
                image: button.data('image')
            }
            Cart.addItem(item);
        }
    )

    let updateReport = () => {
        let count = Cart.itemsCount();
        $('.cart-items-count').text(count);
        $('.cart-subtotal').html(Cart.displayPrice(Cart.subTotal()));
        if (count === 1) {
            $('.cart-items-count-singular').show();
            $('.cart-items-count-plural').hide();
        } else {
            $('.cart-items-count-singular').hide();
            $('.cart-items-count-plural').show();
        }
    }

    let updateCart = () => {
        if (Cart.items.length > 0) {
            let template = Cart.templateCompiler(Cart.lineItemTemplate);
            let lineItems = "";
            for (let i = 0; i < Cart.items.length; i++) {
                lineItems += template(Cart.items[i]);
            }
            $('.cart-line-items').html(lineItems);
            $('.cart-table').show();
            $('.cart-is-empty').hide();
        } else {
            $('.cart-table').hide();
            $('.cart-is-empty').show();
        }
    }

    let update = () => {
        updateReport();
        updateCart();
    }
    update();
    Cart.on('saved', update);
    return Cart;
}


