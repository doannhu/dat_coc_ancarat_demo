Case 8: 
- Customer_C buys new 1kg and 1 lượng, raised an order_1. 
- Store_A raises an order_2 to buy 1kg and 1 lượng from manufacturer.
- Customer_C sells back 1kg and 1 lượng to store, raised an order_3.
- Store_A sells back 1kg and 1 lượng to manufacturer, raised an order_4.

Case 9:
- Customer_A buys 1kg from store_A, raised an order_1.
- Customer_B buys 2kg and 5 lượng from store_A, raised an order_2.
- Store_A raises an order_3 to buy 1kg and 2kg and 5 lượng from manufacturer.
- Customer_A sells back 1kg to store_A, raised an order_4.
- Store_A sells back 1kg to manufacturer, raised an order_5.

Case 10:
- Customer_A buys 1kg from store_A, raised an order_1. product_id=1
- Customer_B buys 2kg and 5 lượng from store_A, raised an order_2. product_id=2 & product_id=3 for 2kg (2x 1kg) & product_id=4 for 5 lượng 
- Store_A raises an order_3 to buy 1kg and 2kg and 5 lượng from manufacturer (product_id=1, product_id=2, product_id=3, product_id=4)
- Customer_C buys 3kg from store_A, raised an order_4. product_id=5 & product_id=6 & product_id=7 for 3kg (3x 1kg)
- Store_A raises an order_5 to buy 3kg from manufacturer (product_id=5, product_id=6, product_id=7)
- Customer_C sells back 3kg to store_A, raised an order_6. product_id=5 & product_id=6 & product_id=7
- Store_A sells back 3kg to manufacturer, raised an order_7. product_id=1 & product_id=2 & product_id=3
- Swapping product_id=1 and product_id=5, product_id=2 and product_id=6, product_id=3 and product_id=7 for customer_A and customer_B


Case 10 in real life:
- Hà Hải Dương buys 1kg from store_HT, raised an order_24. product_id=29
- Lê Thị Na Na buys 1kg from store_HT, raised an order_25. product_id=30
- Store_HT raises an order_26 to buy 2kg from manufacturer (product_id=29, product_id=30)
- Hà Hải Dương sells back 1kg to store_HT, raised an order_27. product_id=29. In Store_HT Inventory, there is an available stock product_id=29 
- Swapping product_id=29 and product_id=30 for Hà Hải Dương and Lê Thị Na Na order_28, The Store_HT Inventory has an available stock product_id=30
- Store_HT sells back 1kg to manufacturer, raised an order_29. product_id=30
- Store_HT receives the product_id 29 from the manufacturer since product_id 30 already sold back to the manufacturer


