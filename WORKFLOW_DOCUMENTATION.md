# Order Workflow Documentation

This document describes the complete order lifecycle in the application, including customer orders, manufacturer orders, buyback, and fulfillment processes.

---

## Table of Contents

1. [Customer Order Workflow](#customer-order-workflow)
2. [Manufacturer Order Workflow](#manufacturer-order-workflow)
3. [Fulfillment Workflow](#fulfillment-workflow)
4. [Buyback Workflow](#buyback-workflow)
5. [Product Status Lifecycle](#product-status-lifecycle)
6. [Transaction Types](#transaction-types)

---

## Customer Order Workflow

### Overview
When a customer places an order (deposits money for products), the staff creates a Sale transaction.

### Access
- **Dashboard → Customer Order** or navigate to `/orders/new`

### Steps
1. **Select Store** - Choose the store where the order is placed
2. **Select Date & Time** - Set the order timestamp
3. **Search/Create Customer** - Find existing customer or create new one
4. **Add Products** - For each product:
   - Select product type (1 lượng, 5 chỉ, 1 kg, etc.)
   - Enter quantity and price
   - Choose if product is "new" (not in inventory) or from existing stock
5. **Select Payment Method** - Cash or Bank Transfer
6. **Submit Order** - Creates a Sale transaction

### Backend Flow
```
POST /api/v1/transactions/order
```
- Creates a `sale` transaction
- For new products: Creates products with status `sold` and `is_ordered=false`
- For existing products: Updates status to `sold`
- Links products to transaction via `transaction_items`

### Product States After
- New products: `status=sold`, `is_ordered=false`
- Existing products: `status=sold`

---

## Manufacturer Order Workflow

### Overview
When staff needs to order products from the manufacturer to fulfill customer orders.

### Access
- **Dashboard → Manufacturer Order** or navigate to `/manufacturer-order`
- **Dashboard → Manufacturer Orders List** or navigate to `/manufacturer-orders`

### Steps (Create Order)
1. **Enter Manufacturer Code** - The manufacturer's order reference number
2. **Select Store** - Which store the order is for
3. **Select Staff** - Who is placing the order
4. **Select Date & Time** - Order timestamp
5. **Add Products** - Select product types and prices
6. **Submit** - Creates a Manufacturer Order transaction

### Backend Flow
```
POST /api/v1/transactions/manufacturer-order
```
- Creates a `mfr` (manufacturer) transaction
- Creates new products with status `available` and `is_ordered=true`
- Updates existing sold products: `is_ordered=true`
- Links products to transaction

### Manufacturer Orders List
Shows:
- **All manufacturer orders** with date filter
- **Code, Time, Store, Staff, Products, Total** columns
- **Delivery status switches** - Toggle `is_delivered` for each product when delivered from manufacturer
- **Pending Products table** - Products from customer orders not yet ordered from manufacturer (`is_ordered=false`, `status=sold`)

---

## Fulfillment Workflow

### Overview
When products are ready and staff delivers them to the customer.

### Access
- **Dashboard → Fulfillment** or navigate to `/fulfillment`

### Steps
1. **Search Customer** - By name, phone number, or CCCD
2. **View Pending Orders** - Shows customer's orders with products that have `sold` status
3. **Select Order** - Click on an order to select it
4. **Select Fulfillment Details**:
   - Date & Time
   - Staff member
   - Store (auto-filled from order)
5. **Review Products** - Can remove items if partial fulfillment
6. **Submit** - Completes the fulfillment

### Backend Flow
```
POST /api/v1/transactions/fulfillment
```
- Creates a `fulfillment` transaction linked to the original sale
- Updates product status to `fulfilled`
- Sets `linked_transaction_id` to the original sale transaction

### Order Status in List
After fulfillment, the original sale order shows **"Fulfilled"** status in the Orders list.

---

## Buyback Workflow

### Overview
When a customer returns products and receives money back.

### Access
- **Dashboard → Buyback** or navigate to `/buyback`

### Steps
1. **Search Customer** - By name, phone number, or CCCD
2. **View Customer Orders** - Shows customer's sale transactions
3. **Select Order** - Click on an order to select it
4. **Set Buyback Prices** - For each product, enter the buyback price (defaults to original price)
5. **Remove Items** - If only some items are being bought back
6. **Select Payment Method** - Cash or Bank Transfer
7. **Submit** - Completes the buyback

### Backend Flow
```
POST /api/v1/transactions/buyback
```
- Creates a `buyback` transaction linked to the original sale
- Updates product status back to `available`
- Updates product `last_price` to the buyback price
- Sets `linked_transaction_id` to the original sale transaction

### Order Status in List
After buyback, the original sale order shows **"Buyback"** status in the Orders list.

---

## Product Status Lifecycle

```
                    ┌─────────────────────────────────────────────────────┐
                    │                                                     │
                    ▼                                                     │
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌───────────┐              │
│ created │───▶│available│───▶│   sold   │───▶│ delivered │              │
└─────────┘    └─────────┘    └──────────┘    └───────────┘              │
     │              ▲              │                                      │
     │              │              │         (buyback)                    │
     │              │              └──────────────────────────────────────┘
     │              │
     │         (manufacturer order)
     │              │
     └──────────────┘
```

### Status Values
| Status | Description |
|--------|-------------|
| `available` | Product is in stock, ready to sell |
| `sold` | Product has been sold to customer but not fulfilled |
| `fulfilled` | Product has been fulfilled/delivered to customer |
| `in_transit` | Product is being transferred (reserved for future use) |
| `ordered` | Product has been ordered (reserved for future use) |

### Additional Flags
| Flag | Description |
|------|-------------|
| `is_ordered` | `true` = Has been ordered from manufacturer |
| `is_delivered` | `true` = Has been delivered from manufacturer to store |

---

## Transaction Types

| Type | Code | Description | Money Flow |
|------|------|-------------|------------|
| Sale | `sale` | Customer places order | Customer → Store |
| Buyback | `buyback` | Customer returns product | Store → Customer |
| Fulfillment | `fulfillment` | Products delivered to customer | N/A (products move) |
| Manufacturer | `mfr` | Order from manufacturer | Store → Manufacturer |

### Transaction Linking
- **Buyback** and **Fulfillment** transactions have `linked_transaction_id` pointing to the original **Sale** transaction
- This allows tracking the full lifecycle of an order

---

## API Endpoints Summary

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/transactions/` | List transactions (supports `tx_type` filter) |
| GET | `/api/v1/transactions/{id}` | Get transaction by ID |
| GET | `/api/v1/transactions/customer/{id}` | Get customer's transactions |
| GET | `/api/v1/transactions/stats` | Get transaction statistics |
| POST | `/api/v1/transactions/order` | Create customer order (sale) |
| POST | `/api/v1/transactions/manufacturer-order` | Create manufacturer order |
| POST | `/api/v1/transactions/buyback` | Create buyback transaction |
| POST | `/api/v1/transactions/fulfillment` | Create fulfillment transaction |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products/` | List all products |
| GET | `/api/v1/products/available` | List available products |
| GET | `/api/v1/products/store/{store_id}` | Get available products by store |
| GET | `/api/v1/products/pending-manufacturer` | Products needing manufacturer order |
| POST | `/api/v1/products/{id}/move` | Move product between stores |
| POST | `/api/v1/products/delivery-status/batch` | Batch update delivery status from manufacturer |

---

## Database Schema Notes

### Key Tables
- **transactions** - All transaction records
- **transaction_items** - Junction table linking transactions to products
- **products** - All product records with status and pricing
- **customers** - Customer information
- **stores** - Store locations
- **staff** - Staff members

### Important Fields
- `transactions.linked_transaction_id` - Links buyback/fulfillment to original sale
- `transactions.code` - Manufacturer order code
- `products.is_ordered` - Whether product has been ordered from manufacturer
- `products.is_delivered` - Whether product has been delivered from manufacturer to store
- `products.last_price` - Current/last price of product
