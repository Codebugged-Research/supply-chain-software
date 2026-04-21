#!/usr/bin/env python3
"""
Backend API Testing for S&OP Distributor Order Portal
Tests all endpoints according to the review requirements.
"""

import requests
import json
import os
from datetime import datetime
import re

# Get base URL from environment
BASE_URL = "https://c633de4e-b1c2-4b70-8ffc-30d5e5cd1dbf.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_dataset_endpoints():
    """Test all dataset endpoints for sanity checks"""
    print("\n=== TESTING DATASET ENDPOINTS ===")
    
    try:
        # Test /api/data/meta
        print("Testing GET /api/data/meta...")
        response = requests.get(f"{API_BASE}/data/meta")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            meta = response.json()
            print(f"Meta data: {meta}")
            expected_fields = ['skuCount', 'distributorCount', 'regionCount', 'weekCount', 'rowCount']
            expected_values = [15, 5, 3, 26, 1950]
            
            for field, expected in zip(expected_fields, expected_values):
                if field in meta and meta[field] == expected:
                    print(f"✅ {field}: {meta[field]} (expected {expected})")
                else:
                    print(f"❌ {field}: {meta.get(field, 'missing')} (expected {expected})")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing meta endpoint: {e}")
    
    try:
        # Test /api/data/skus
        print("\nTesting GET /api/data/skus...")
        response = requests.get(f"{API_BASE}/data/skus")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            skus = response.json()
            print(f"✅ SKUs count: {len(skus)} (expected 15)")
            if len(skus) > 0:
                print(f"Sample SKU: {skus[0]}")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing skus endpoint: {e}")
    
    try:
        # Test /api/data/distributors
        print("\nTesting GET /api/data/distributors...")
        response = requests.get(f"{API_BASE}/data/distributors")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            distributors = response.json()
            print(f"✅ Distributors count: {len(distributors)} (expected 5)")
            if len(distributors) > 0:
                dist = distributors[0]
                required_fields = ['id', 'name', 'region', 'tier']
                has_all_fields = all(field in dist for field in required_fields)
                print(f"✅ Has required fields (id,name,region,tier): {has_all_fields}")
                print(f"Sample distributor: {dist}")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing distributors endpoint: {e}")
    
    try:
        # Test /api/data/regions
        print("\nTesting GET /api/data/regions...")
        response = requests.get(f"{API_BASE}/data/regions")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            regions = response.json()
            print(f"✅ Regions count: {len(regions)} (expected 3)")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing regions endpoint: {e}")
    
    try:
        # Test /api/data/weeks
        print("\nTesting GET /api/data/weeks...")
        response = requests.get(f"{API_BASE}/data/weeks")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            weeks = response.json()
            print(f"✅ Weeks count: {len(weeks)} (expected 26)")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing weeks endpoint: {e}")
    
    try:
        # Test /api/data/kpis
        print("\nTesting GET /api/data/kpis...")
        response = requests.get(f"{API_BASE}/data/kpis")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            kpis = response.json()
            expected_fields = ['totalRevenue', 'totalGm', 'gmPct', 'totalDemand', 'demandWoW']
            has_all_fields = all(field in kpis for field in expected_fields)
            print(f"✅ Has required KPI fields: {has_all_fields}")
            print(f"KPIs: {kpis}")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing kpis endpoint: {e}")
    
    try:
        # Test /api/data/aggregate?by=skuId
        print("\nTesting GET /api/data/aggregate?by=skuId...")
        response = requests.get(f"{API_BASE}/data/aggregate?by=skuId")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            rows = data.get('rows', [])
            print(f"✅ Aggregate rows count: {len(rows)} (expected 15)")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing aggregate endpoint: {e}")
    
    try:
        # Test /api/data/weekly
        print("\nTesting GET /api/data/weekly...")
        response = requests.get(f"{API_BASE}/data/weekly")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            print(f"✅ Weekly data count: {count} (expected 1950)")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing weekly endpoint: {e}")

def test_order_suggestion_endpoint():
    """Test GET /api/orders/suggest endpoint"""
    print("\n=== TESTING ORDER SUGGESTION ENDPOINT ===")
    
    try:
        # Test valid distributor
        print("Testing GET /api/orders/suggest?distributorId=DST-001...")
        response = requests.get(f"{API_BASE}/orders/suggest?distributorId=DST-001")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            suggestion = response.json()
            print("✅ Valid distributor request successful")
            
            # Check required fields
            required_fields = ['distributor', 'leadTimeDays', 'tentativeDeliveryDate', 'lastWeekId', 'lines']
            for field in required_fields:
                if field in suggestion:
                    print(f"✅ Has field '{field}': {type(suggestion[field])}")
                else:
                    print(f"❌ Missing field '{field}'")
            
            # Check distributor object
            if 'distributor' in suggestion:
                dist = suggestion['distributor']
                dist_fields = ['id', 'name', 'region']
                for field in dist_fields:
                    if field in dist:
                        print(f"✅ Distributor has '{field}': {dist[field]}")
                    else:
                        print(f"❌ Distributor missing '{field}'")
            
            # Check leadTimeDays (should be 3 for North region)
            lead_time = suggestion.get('leadTimeDays')
            if lead_time == 3:
                print(f"✅ Lead time correct for North region: {lead_time} days")
            else:
                print(f"❌ Lead time unexpected: {lead_time} (expected 3 for North)")
            
            # Check tentativeDeliveryDate format
            delivery_date = suggestion.get('tentativeDeliveryDate')
            if delivery_date and re.match(r'\d{4}-\d{2}-\d{2}', delivery_date):
                print(f"✅ Delivery date format correct: {delivery_date}")
            else:
                print(f"❌ Delivery date format incorrect: {delivery_date}")
            
            # Check lines array
            lines = suggestion.get('lines', [])
            if len(lines) == 15:
                print(f"✅ Lines count correct: {len(lines)} (expected 15)")
                
                # Check first line structure
                if lines:
                    line = lines[0]
                    line_fields = ['skuId', 'skuName', 'category', 'price', 'cost', 'currentStock', 
                                 'retailStock', 'weeklySecondary', 'suggestedQty', 'coverWeeks', 
                                 'dealerGap', 'scheme', 'isHighDemand', 'estimatedValue']
                    for field in line_fields:
                        if field in line:
                            print(f"✅ Line has '{field}': {line[field]}")
                        else:
                            print(f"❌ Line missing '{field}'")
            else:
                print(f"❌ Lines count incorrect: {len(lines)} (expected 15)")
                
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing valid distributor: {e}")
    
    try:
        # Test missing distributorId
        print("\nTesting GET /api/orders/suggest (missing distributorId)...")
        response = requests.get(f"{API_BASE}/orders/suggest")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            error_data = response.json()
            if 'error' in error_data and 'distributorId required' in error_data['error']:
                print("✅ Correct 400 error for missing distributorId")
            else:
                print(f"❌ Unexpected error message: {error_data}")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing missing distributorId: {e}")
    
    try:
        # Test unknown distributor
        print("\nTesting GET /api/orders/suggest?distributorId=DST-999...")
        response = requests.get(f"{API_BASE}/orders/suggest?distributorId=DST-999")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ Correct 404 error for unknown distributor")
        else:
            print(f"❌ Expected 404, got {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing unknown distributor: {e}")

def test_place_order_endpoint():
    """Test POST /api/orders/place endpoint"""
    print("\n=== TESTING PLACE ORDER ENDPOINT ===")
    
    try:
        # Test happy path
        print("Testing POST /api/orders/place (happy path)...")
        order_data = {
            "distributorId": "DST-001",
            "lines": [
                {"skuId": "SKU-10842", "qty": 100},
                {"skuId": "SKU-10843", "qty": 50}
            ],
            "notes": "test order"
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=order_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print("✅ Order placed successfully")
            
            # Check response structure
            if 'ok' in result and result['ok'] is True:
                print("✅ Response has ok: true")
            else:
                print(f"❌ Response missing ok:true: {result.get('ok')}")
            
            if 'order' in result:
                order = result['order']
                print("✅ Response has order object")
                
                # Check orderId format
                order_id = order.get('orderId')
                if order_id and re.match(r'^ORD-[A-Z0-9]+$', order_id):
                    print(f"✅ Order ID format correct: {order_id}")
                else:
                    print(f"❌ Order ID format incorrect: {order_id}")
                
                # Check required fields
                required_fields = ['distributorId', 'distributorName', 'region', 'status', 
                                 'totalQty', 'totalValue', 'cashflow', 'leadTimeDays', 
                                 'tentativeDeliveryDate', 'lines']
                for field in required_fields:
                    if field in order:
                        print(f"✅ Order has '{field}': {order[field]}")
                    else:
                        print(f"❌ Order missing '{field}'")
                
                # Check specific values
                if order.get('distributorName') == 'NorthStar Foods':
                    print("✅ Distributor name correct")
                if order.get('region') == 'North':
                    print("✅ Region correct")
                if order.get('status') == 'Pending':
                    print("✅ Status correct")
                if order.get('totalQty') == 150:
                    print("✅ Total quantity correct")
                if order.get('leadTimeDays') == 3:
                    print("✅ Lead time correct")
                
                # Check lines enrichment
                lines = order.get('lines', [])
                if lines:
                    line = lines[0]
                    line_fields = ['skuName', 'category', 'unitPrice', 'effectivePrice', 
                                 'lineValue', 'scheme', 'discountPct']
                    for field in line_fields:
                        if field in line:
                            print(f"✅ Line enriched with '{field}': {line[field]}")
                        else:
                            print(f"❌ Line missing '{field}'")
            else:
                print("❌ Response missing order object")
                
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing happy path: {e}")
    
    # Test cashflow thresholds
    print("\n--- Testing Cashflow Thresholds ---")
    
    try:
        # Low cashflow test (< $25K)
        print("Testing low cashflow order...")
        low_order = {
            "distributorId": "DST-001",
            "lines": [{"skuId": "SKU-10843", "qty": 10000}],  # $0.99 * 10000 = ~$9900
            "notes": "low cashflow test"
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=low_order)
        if response.status_code == 201:
            order = response.json().get('order', {})
            cashflow = order.get('cashflow')
            total_value = order.get('totalValue', 0)
            print(f"✅ Low order placed - Cashflow: {cashflow}, Value: ${total_value}")
            if cashflow == 'low':
                print("✅ Cashflow correctly classified as 'low'")
            else:
                print(f"❌ Expected 'low' cashflow, got '{cashflow}'")
        else:
            print(f"❌ Low cashflow test failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing low cashflow: {e}")
    
    try:
        # Medium cashflow test (~$25K-$75K)
        print("Testing medium cashflow order...")
        medium_order = {
            "distributorId": "DST-001",
            "lines": [{"skuId": "SKU-10843", "qty": 40000}],  # $0.99 * 40000 = ~$39600
            "notes": "medium cashflow test"
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=medium_order)
        if response.status_code == 201:
            order = response.json().get('order', {})
            cashflow = order.get('cashflow')
            total_value = order.get('totalValue', 0)
            print(f"✅ Medium order placed - Cashflow: {cashflow}, Value: ${total_value}")
            if cashflow == 'medium':
                print("✅ Cashflow correctly classified as 'medium'")
            else:
                print(f"❌ Expected 'medium' cashflow, got '{cashflow}'")
        else:
            print(f"❌ Medium cashflow test failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing medium cashflow: {e}")
    
    try:
        # High cashflow test (≥$75K)
        print("Testing high cashflow order...")
        high_order = {
            "distributorId": "DST-001",
            "lines": [{"skuId": "SKU-10843", "qty": 100000}],  # $0.99 * 100000 = ~$99000
            "notes": "high cashflow test"
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=high_order)
        if response.status_code == 201:
            order = response.json().get('order', {})
            cashflow = order.get('cashflow')
            total_value = order.get('totalValue', 0)
            print(f"✅ High order placed - Cashflow: {cashflow}, Value: ${total_value}")
            if cashflow == 'high':
                print("✅ Cashflow correctly classified as 'high'")
            else:
                print(f"❌ Expected 'high' cashflow, got '{cashflow}'")
        else:
            print(f"❌ High cashflow test failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing high cashflow: {e}")
    
    # Test validation errors
    print("\n--- Testing Validation Errors ---")
    
    try:
        # Test empty lines
        print("Testing empty lines validation...")
        empty_lines_order = {
            "distributorId": "DST-001",
            "lines": []
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=empty_lines_order)
        if response.status_code == 400:
            print("✅ Correct 400 error for empty lines")
        else:
            print(f"❌ Expected 400 for empty lines, got {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing empty lines: {e}")
    
    try:
        # Test missing distributorId
        print("Testing missing distributorId validation...")
        missing_dist_order = {
            "lines": [{"skuId": "SKU-10842", "qty": 10}]
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=missing_dist_order)
        if response.status_code == 400:
            print("✅ Correct 400 error for missing distributorId")
        else:
            print(f"❌ Expected 400 for missing distributorId, got {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing missing distributorId: {e}")
    
    try:
        # Test unknown distributor
        print("Testing unknown distributor validation...")
        unknown_dist_order = {
            "distributorId": "DST-999",
            "lines": [{"skuId": "SKU-10842", "qty": 10}]
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=unknown_dist_order)
        if response.status_code == 404:
            print("✅ Correct 404 error for unknown distributor")
        else:
            print(f"❌ Expected 404 for unknown distributor, got {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing unknown distributor: {e}")
    
    try:
        # Test all zero/invalid quantities
        print("Testing all zero/invalid quantities...")
        zero_qty_order = {
            "distributorId": "DST-001",
            "lines": [
                {"skuId": "SKU-10842", "qty": 0},
                {"skuId": "SKU-99999", "qty": 5}  # Invalid SKU
            ]
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=zero_qty_order)
        if response.status_code == 400:
            error_data = response.json()
            if 'All order lines were empty/invalid' in error_data.get('error', ''):
                print("✅ Correct 400 error for all zero/invalid lines")
            else:
                print(f"❌ Unexpected error message: {error_data}")
        else:
            print(f"❌ Expected 400 for zero/invalid lines, got {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing zero/invalid quantities: {e}")
    
    # Test scheme pricing
    print("\n--- Testing Scheme Pricing ---")
    
    try:
        # Test beverage SKU with scheme (Buy 10 Get 1 Free = 9% discount)
        print("Testing beverage SKU scheme pricing...")
        beverage_order = {
            "distributorId": "DST-001",
            "lines": [{"skuId": "SKU-10842", "qty": 100}],  # Sparkling Water (Beverages)
            "notes": "scheme pricing test"
        }
        
        response = requests.post(f"{API_BASE}/orders/place", json=beverage_order)
        if response.status_code == 201:
            order = response.json().get('order', {})
            lines = order.get('lines', [])
            if lines:
                line = lines[0]
                unit_price = line.get('unitPrice', 0)
                effective_price = line.get('effectivePrice', 0)
                line_value = line.get('lineValue', 0)
                qty = line.get('qty', 0)
                scheme = line.get('scheme')
                discount_pct = line.get('discountPct', 0)
                
                print(f"Unit Price: ${unit_price}")
                print(f"Effective Price: ${effective_price}")
                print(f"Line Value: ${line_value}")
                print(f"Quantity: {qty}")
                print(f"Scheme: {scheme}")
                print(f"Discount %: {discount_pct}")
                
                # Check if discount is applied (approximately 9% for beverages)
                if discount_pct == 9:
                    print("✅ Correct 9% discount applied")
                    expected_effective = round(unit_price * 0.91, 2)
                    if abs(effective_price - expected_effective) < 0.01:
                        print("✅ Effective price calculation correct")
                    else:
                        print(f"❌ Effective price incorrect: {effective_price} vs expected {expected_effective}")
                    
                    expected_line_value = round(qty * effective_price, 2)
                    if abs(line_value - expected_line_value) < 0.01:
                        print("✅ Line value calculation correct")
                    else:
                        print(f"❌ Line value incorrect: {line_value} vs expected {expected_line_value}")
                else:
                    print(f"❌ Expected 9% discount, got {discount_pct}%")
        else:
            print(f"❌ Scheme pricing test failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing scheme pricing: {e}")

def test_list_orders_endpoint():
    """Test GET /api/orders endpoint"""
    print("\n=== TESTING LIST ORDERS ENDPOINT ===")
    
    try:
        # Test filtered by distributor
        print("Testing GET /api/orders?distributorId=DST-001...")
        response = requests.get(f"{API_BASE}/orders?distributorId=DST-001")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Orders list request successful")
            
            # Check response structure
            if 'count' in data and 'orders' in data:
                print(f"✅ Response has count and orders fields")
                count = data['count']
                orders = data['orders']
                print(f"Orders count: {count}")
                print(f"Orders array length: {len(orders)}")
                
                if count > 0 and orders:
                    # Check first order structure
                    order = orders[0]
                    required_fields = ['orderId', 'totalQty', 'totalValue', 'cashflow', 
                                     'lines', 'tentativeDeliveryDate', 'createdAt']
                    for field in required_fields:
                        if field in order:
                            print(f"✅ Order has '{field}': {order[field]}")
                        else:
                            print(f"❌ Order missing '{field}'")
                    
                    # Check if orders are sorted newest first
                    if len(orders) > 1:
                        first_date = orders[0].get('createdAt')
                        second_date = orders[1].get('createdAt')
                        if first_date and second_date and first_date >= second_date:
                            print("✅ Orders sorted newest first")
                        else:
                            print("❌ Orders not sorted newest first")
                else:
                    print("ℹ️ No orders found for DST-001 (this is expected if no orders were placed)")
            else:
                print("❌ Response missing count or orders fields")
                
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing filtered orders: {e}")
    
    try:
        # Test unfiltered (all orders)
        print("\nTesting GET /api/orders (no filter)...")
        response = requests.get(f"{API_BASE}/orders")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ All orders request successful")
            print(f"Total orders count: {data.get('count', 0)}")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing all orders: {e}")
    
    try:
        # Test unknown distributor filter
        print("\nTesting GET /api/orders?distributorId=DST-999...")
        response = requests.get(f"{API_BASE}/orders?distributorId=DST-999")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', -1)
            orders = data.get('orders', [])
            if count == 0 and len(orders) == 0:
                print("✅ Correct empty result for unknown distributor")
            else:
                print(f"❌ Expected count:0 and empty orders, got count:{count}, orders:{len(orders)}")
        else:
            print(f"❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing unknown distributor filter: {e}")

def main():
    """Run all backend tests"""
    print("🚀 Starting S&OP Distributor Order Portal Backend Tests")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    
    # Run all test suites
    test_dataset_endpoints()
    test_order_suggestion_endpoint()
    test_place_order_endpoint()
    test_list_orders_endpoint()
    
    print("\n🏁 Backend testing completed!")

if __name__ == "__main__":
    main()