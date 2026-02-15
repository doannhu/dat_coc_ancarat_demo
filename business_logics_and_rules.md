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


Cass 11: Fulfillment for multiple transactions (Trả hàng cho khách)
- Make sure the list only contains the transactions that are 'Đã cọc' (Sold) or 'Đã nhận hàng NSX' (Received from manufacturer)


Case 12: 
- Store_A orders extra 2x1kg and 4x 5 lượng from manufacturer, raised an order_32. product_id=31 to product_id=36
- Customer_A buys 1kg from store_A, raised an order_33. product_id=31
- Customer_A sells back 1kg to store_A, raised an order_34. product_id=31. In Store_A Inventory, there is an available stock product_id=31
- Customer_B buys 1kg from store_A, raised an order_35. product_id=31. In Store_A Inventory, there is no available stock product_id=31


Case 13: moving product from one store to another
- Store_A has 1 kg extra product_id=32, move the product_id=32 to store_B
- Customer_A now able to buy 1kg from store_B
- Product_id=32 is delivered to store_B
- Customer_A receives the product_id=32 from store_B


Business Rules:
- KH đặt cọc -> Cửa hàng đặt hàng từ nhà sản xuất -> Nhà sản xuất giao hàng -> Cửa hàng nhận hàng -> Khách hàng nhận hàng
- KH đặt cọc -> KH bán lại cho cửa hàng -> Cửa hàng đưa vào kho -> Cửa hàng bán lại cho nhà sản xuất
- KH đặt cọc ->  KH bán lại cho cửa hàng -> Cửa hàng đưa vào kho -> Cửa hàng bán lại cho khách hàng khác -> Nhà sản xuất giao hàng -> Cửa hàng nhận hàng -> Khách hàng nhận hàng


- Nhận hàng từ nhà sản xuất: 
    - Hàng chưa được giao (khách đã nhận hàng), 
    - Hàng chưa được nhận từ nhà sản xuất, 
    - Hàng chưa bán lại cho nhà sản xuất
- Bán lại đơn cho nhà sản xuất: 
    - Hàng chưa được giao (khách đã nhận hàng), 
    - Hàng chưa được bán lại cho nhà sản xuất và 
    - Hàng chưa nhận được từ nhà sản xuất
- Trả hàng cho khách hàng: 
    - Hàng chưa được giao (khách đã nhận hàng), 
    - Hàng chưa được bán lại cho nhà sản xuất và 
    - Hàng đã nhận được từ nhà sản xuất