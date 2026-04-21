#!/usr/bin/env python3
"""
Backend Test Script for Order Freeze Logic
Tests the S&OP Enterprise Planning System Order Freeze Logic endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://snop-portal.preview.emergentagent.com/api"

def log_test(test_name, success, details=""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_orders_rules():
    """Test GET /api/orders/rules endpoint with various simDay values"""
    print("=== Testing GET /api/orders/rules ===")
    
    try:
        # Test 1: No query parameter (should use today's UTC day)
        response = requests.get(f"{BASE_URL}/orders/rules")
        if response.status_code == 200:
            data = response.json()
            today_day = datetime.utcnow().day
            
            # Verify structure
            has_lock_state = 'lockState' in data
            has_rules = 'rules' in data and len(data['rules']) == 3
            correct_day = data.get('lockState', {}).get('day') == today_day
            
            log_test("GET /api/orders/rules (no query)", 
                    has_lock_state and has_rules and correct_day,
                    f"lockState.day={data.get('lockState', {}).get('day')}, expected={today_day}")
        else:
            log_test("GET /api/orders/rules (no query)", False, f"Status: {response.status_code}")
        
        # Test 2: simDay=10 (editable)
        response = requests.get(f"{BASE_URL}/orders/rules?simDay=10")
        if response.status_code == 200:
            data = response.json()
            lock_state = data.get('lockState', {})
            is_editable = lock_state.get('state') == 'editable'
            correct_day = lock_state.get('day') == 10
            null_max_delta = lock_state.get('maxDeltaPct') is None
            
            log_test("GET /api/orders/rules?simDay=10", 
                    is_editable and correct_day and null_max_delta,
                    f"state={lock_state.get('state')}, day={lock_state.get('day')}, maxDeltaPct={lock_state.get('maxDeltaPct')}")
        else:
            log_test("GET /api/orders/rules?simDay=10", False, f"Status: {response.status_code}")
        
        # Test 3: simDay=26 (restricted)
        response = requests.get(f"{BASE_URL}/orders/rules?simDay=26")
        if response.status_code == 200:
            data = response.json()
            lock_state = data.get('lockState', {})
            is_restricted = lock_state.get('state') == 'restricted'
            correct_day = lock_state.get('day') == 26
            correct_max_delta = lock_state.get('maxDeltaPct') == 10
            
            log_test("GET /api/orders/rules?simDay=26", 
                    is_restricted and correct_day and correct_max_delta,
                    f"state={lock_state.get('state')}, day={lock_state.get('day')}, maxDeltaPct={lock_state.get('maxDeltaPct')}")
        else:
            log_test("GET /api/orders/rules?simDay=26", False, f"Status: {response.status_code}")
        
        # Test 4: simDay=30 (locked)
        response = requests.get(f"{BASE_URL}/orders/rules?simDay=30")
        if response.status_code == 200:
            data = response.json()
            lock_state = data.get('lockState', {})
            is_locked = lock_state.get('state') == 'locked'
            correct_day = lock_state.get('day') == 30
            zero_max_delta = lock_state.get('maxDeltaPct') == 0
            
            log_test("GET /api/orders/rules?simDay=30", 
                    is_locked and correct_day and zero_max_delta,
                    f"state={lock_state.get('state')}, day={lock_state.get('day')}, maxDeltaPct={lock_state.get('maxDeltaPct')}")
        else:
            log_test("GET /api/orders/rules?simDay=30", False, f"Status: {response.status_code}")
        
        # Test 5: simDay=99 (should clamp to 31, locked)
        response = requests.get(f"{BASE_URL}/orders/rules?simDay=99")
        if response.status_code == 200:
            data = response.json()
            lock_state = data.get('lockState', {})
            is_locked = lock_state.get('state') == 'locked'
            clamped_day = lock_state.get('day') == 31
            
            log_test("GET /api/orders/rules?simDay=99", 
                    is_locked and clamped_day,
                    f"state={lock_state.get('state')}, day={lock_state.get('day')} (clamped to 31)")
        else:
            log_test("GET /api/orders/rules?simDay=99", False, f"Status: {response.status_code}")
        
        # Test 6: simDay=0 (should clamp to 1, editable)
        response = requests.get(f"{BASE_URL}/orders/rules?simDay=0")
        if response.status_code == 200:
            data = response.json()
            lock_state = data.get('lockState', {})
            is_editable = lock_state.get('state') == 'editable'
            clamped_day = lock_state.get('day') == 1
            
            log_test("GET /api/orders/rules?simDay=0", 
                    is_editable and clamped_day,
                    f"state={lock_state.get('state')}, day={lock_state.get('day')} (clamped to 1)")
        else:
            log_test("GET /api/orders/rules?simDay=0", False, f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("GET /api/orders/rules tests", False, f"Exception: {str(e)}")

def seed_fresh_order():
    """Seed a fresh order and return the orderId"""
    print("=== Seeding Fresh Order ===")
    
    try:
        order_data = {
            "distributorId": "DST-001",
            "lines": [
                {"skuId": "SKU-10842", "qty": 100},
                {"skuId": "SKU-10843", "qty": 50}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/orders/place", json=order_data)
        if response.status_code == 201:
            data = response.json()
            order_id = data.get('order', {}).get('orderId')
            has_lock_state = 'lockState' in data.get('order', {})
            
            log_test("POST /api/orders/place", 
                    order_id is not None and has_lock_state,
                    f"orderId={order_id}, lockState present={has_lock_state}")
            return order_id
        else:
            log_test("POST /api/orders/place", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
            
    except Exception as e:
        log_test("POST /api/orders/place", False, f"Exception: {str(e)}")
        return None

def test_orders_list_with_simday():
    """Test GET /api/orders with simDay parameter"""
    print("=== Testing GET /api/orders with simDay ===")
    
    try:
        response = requests.get(f"{BASE_URL}/orders?distributorId=DST-001&simDay=26")
        if response.status_code == 200:
            data = response.json()
            has_lock_state = 'lockState' in data
            lock_state_restricted = data.get('lockState', {}).get('state') == 'restricted'
            
            # Check if orders have lockState
            orders = data.get('orders', [])
            orders_have_lock_state = all('lockState' in order for order in orders)
            orders_restricted = all(order.get('lockState', {}).get('state') == 'restricted' for order in orders)
            
            log_test("GET /api/orders?distributorId=DST-001&simDay=26", 
                    has_lock_state and lock_state_restricted and orders_have_lock_state and orders_restricted,
                    f"lockState.state={data.get('lockState', {}).get('state')}, orders count={len(orders)}")
        else:
            log_test("GET /api/orders?distributorId=DST-001&simDay=26", False, f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("GET /api/orders with simDay", False, f"Exception: {str(e)}")

def test_patch_editable(order_id):
    """Test PATCH /api/orders/update in editable state"""
    print("=== Testing PATCH /api/orders/update (Editable) ===")
    
    if not order_id:
        log_test("PATCH editable (skipped)", False, "No order_id available")
        return
    
    try:
        update_data = {
            "orderId": order_id,
            "simDay": 20,
            "lines": [
                {"skuId": "SKU-10842", "qty": 150},
                {"skuId": "SKU-10843", "qty": 80}
            ]
        }
        
        response = requests.patch(f"{BASE_URL}/orders/update", json=update_data)
        if response.status_code == 200:
            data = response.json()
            action_edited = data.get('action') == 'edited'
            status_amended = data.get('order', {}).get('status') == 'Amended'
            total_qty = data.get('order', {}).get('totalQty') == 230
            has_two_lines = len(data.get('order', {}).get('lines', [])) == 2
            
            log_test("PATCH editable (happy path)", 
                    action_edited and status_amended and total_qty and has_two_lines,
                    f"action={data.get('action')}, status={data.get('order', {}).get('status')}, totalQty={data.get('order', {}).get('totalQty')}")
        else:
            log_test("PATCH editable (happy path)", False, f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("PATCH editable", False, f"Exception: {str(e)}")

def test_patch_restricted_ok(order_id):
    """Test PATCH /api/orders/update in restricted state (within ±10%)"""
    print("=== Testing PATCH /api/orders/update (Restricted OK) ===")
    
    if not order_id:
        log_test("PATCH restricted OK (skipped)", False, "No order_id available")
        return
    
    try:
        # Using the edited order (qty 150 & 80 as original now)
        # ~5% up, ~5% down
        update_data = {
            "orderId": order_id,
            "simDay": 26,
            "lines": [
                {"skuId": "SKU-10842", "qty": 158},  # 150 -> 158 (~5% up)
                {"skuId": "SKU-10843", "qty": 76}    # 80 -> 76 (~5% down)
            ]
        }
        
        response = requests.patch(f"{BASE_URL}/orders/update", json=update_data)
        if response.status_code == 200:
            data = response.json()
            action_edited = data.get('action') == 'edited'
            status_amended = data.get('order', {}).get('status') == 'Amended'
            total_qty = data.get('order', {}).get('totalQty') == 234
            
            log_test("PATCH restricted OK (within ±10%)", 
                    action_edited and status_amended and total_qty,
                    f"action={data.get('action')}, status={data.get('order', {}).get('status')}, totalQty={data.get('order', {}).get('totalQty')}")
        else:
            log_test("PATCH restricted OK (within ±10%)", False, f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("PATCH restricted OK", False, f"Exception: {str(e)}")

def test_patch_restricted_violation(order_id):
    """Test PATCH /api/orders/update in restricted state (>10% violation)"""
    print("=== Testing PATCH /api/orders/update (Restricted Violation) ===")
    
    if not order_id:
        log_test("PATCH restricted violation (skipped)", False, "No order_id available")
        return
    
    try:
        # qty 158 -> 300 ≈ +89.9%
        update_data = {
            "orderId": order_id,
            "simDay": 26,
            "lines": [
                {"skuId": "SKU-10842", "qty": 300},
                {"skuId": "SKU-10843", "qty": 76}
            ]
        }
        
        response = requests.patch(f"{BASE_URL}/orders/update", json=update_data)
        if response.status_code == 400:
            data = response.json()
            error_mentions_10pct = "±10%" in data.get('error', '')
            error_mentions_change = "Your change was" in data.get('error', '')
            has_max_delta_pct = 'maxDeltaPct' in data and data['maxDeltaPct'] > 10
            has_lock_state = 'lockState' in data and data['lockState'].get('state') == 'restricted'
            
            log_test("PATCH restricted violation (>10%)", 
                    error_mentions_10pct and error_mentions_change and has_max_delta_pct and has_lock_state,
                    f"Error mentions ±10%: {error_mentions_10pct}, mentions change: {error_mentions_change}, maxDeltaPct: {data.get('maxDeltaPct')}")
        else:
            log_test("PATCH restricted violation (>10%)", False, f"Expected 400, got {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("PATCH restricted violation", False, f"Exception: {str(e)}")

def test_patch_locked_edit(order_id):
    """Test PATCH /api/orders/update in locked state (no approval flag)"""
    print("=== Testing PATCH /api/orders/update (Locked Edit) ===")
    
    if not order_id:
        log_test("PATCH locked edit (skipped)", False, "No order_id available")
        return
    
    try:
        update_data = {
            "orderId": order_id,
            "simDay": 30,
            "lines": [
                {"skuId": "SKU-10842", "qty": 160}
            ]
        }
        
        response = requests.patch(f"{BASE_URL}/orders/update", json=update_data)
        if response.status_code == 403:
            data = response.json()
            error_mentions_locked = "locked" in data.get('error', '').lower()
            error_mentions_approval = "request_approval" in data.get('error', '')
            has_lock_state = 'lockState' in data and data['lockState'].get('state') == 'locked'
            
            log_test("PATCH locked edit (no approval)", 
                    error_mentions_locked and error_mentions_approval and has_lock_state,
                    f"Error mentions locked: {error_mentions_locked}, mentions request_approval: {error_mentions_approval}")
        else:
            log_test("PATCH locked edit (no approval)", False, f"Expected 403, got {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("PATCH locked edit", False, f"Exception: {str(e)}")

def test_patch_locked_request_approval(order_id):
    """Test PATCH /api/orders/update with request_approval in locked state"""
    print("=== Testing PATCH /api/orders/update (Locked Request Approval) ===")
    
    if not order_id:
        log_test("PATCH locked request approval (skipped)", False, "No order_id available")
        return
    
    try:
        update_data = {
            "orderId": order_id,
            "simDay": 30,
            "action": "request_approval",
            "note": "urgent top-up",
            "lines": [
                {"skuId": "SKU-10842", "qty": 200},
                {"skuId": "SKU-10843", "qty": 90}
            ]
        }
        
        response = requests.patch(f"{BASE_URL}/orders/update", json=update_data)
        if response.status_code == 202:
            data = response.json()
            action_approval_requested = data.get('action') == 'approval_requested'
            status_pending_approval = data.get('order', {}).get('status') == 'Pending Approval'
            pending_status = data.get('order', {}).get('pendingApproval', {}).get('status') == 'pending'
            requested_total_qty = data.get('order', {}).get('pendingApproval', {}).get('requestedTotalQty') == 290
            note_correct = data.get('order', {}).get('pendingApproval', {}).get('note') == "urgent top-up"
            
            log_test("PATCH locked request approval", 
                    action_approval_requested and status_pending_approval and pending_status and requested_total_qty and note_correct,
                    f"action={data.get('action')}, status={data.get('order', {}).get('status')}, requestedTotalQty={data.get('order', {}).get('pendingApproval', {}).get('requestedTotalQty')}")
        else:
            log_test("PATCH locked request approval", False, f"Expected 202, got {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("PATCH locked request approval", False, f"Exception: {str(e)}")

def test_patch_approve(order_id):
    """Test PATCH /api/orders/update with approve action"""
    print("=== Testing PATCH /api/orders/update (Approve) ===")
    
    if not order_id:
        log_test("PATCH approve (skipped)", False, "No order_id available")
        return
    
    try:
        update_data = {
            "orderId": order_id,
            "simDay": 30,
            "action": "approve",
            "note": "ok"
        }
        
        response = requests.patch(f"{BASE_URL}/orders/update", json=update_data)
        if response.status_code == 200:
            data = response.json()
            action_approved = data.get('action') == 'approved'
            status_approved = data.get('order', {}).get('status') == 'Approved'
            total_qty = data.get('order', {}).get('totalQty') == 290
            lines_count = len(data.get('order', {}).get('lines', [])) == 2
            pending_approved = data.get('order', {}).get('pendingApproval', {}).get('status') == 'approved'
            decided_by_set = data.get('order', {}).get('pendingApproval', {}).get('decidedBy') is not None
            
            log_test("PATCH approve", 
                    action_approved and status_approved and total_qty and lines_count and pending_approved and decided_by_set,
                    f"action={data.get('action')}, status={data.get('order', {}).get('status')}, totalQty={data.get('order', {}).get('totalQty')}")
        else:
            log_test("PATCH approve", False, f"Expected 200, got {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("PATCH approve", False, f"Exception: {str(e)}")

def test_patch_reject_flow(order_id):
    """Test PATCH /api/orders/update reject flow"""
    print("=== Testing PATCH /api/orders/update (Reject Flow) ===")
    
    if not order_id:
        log_test("PATCH reject flow (skipped)", False, "No order_id available")
        return
    
    try:
        # First place a new approval request
        request_data = {
            "orderId": order_id,
            "simDay": 30,
            "action": "request_approval",
            "note": "test reject",
            "lines": [
                {"skuId": "SKU-10842", "qty": 50}
            ]
        }
        
        response = requests.patch(f"{BASE_URL}/orders/update", json=request_data)
        if response.status_code == 202:
            data = response.json()
            status_pending = data.get('order', {}).get('status') == 'Pending Approval'
            
            if status_pending:
                # Now reject it
                reject_data = {
                    "orderId": order_id,
                    "simDay": 30,
                    "action": "reject",
                    "note": "not approved"
                }
                
                response = requests.patch(f"{BASE_URL}/orders/update", json=reject_data)
                if response.status_code == 200:
                    data = response.json()
                    action_rejected = data.get('action') == 'rejected'
                    status_rejected = data.get('order', {}).get('status') == 'Rejected'
                    pending_rejected = data.get('order', {}).get('pendingApproval', {}).get('status') == 'rejected'
                    rejection_note = data.get('order', {}).get('pendingApproval', {}).get('rejectionNote') == "not approved"
                    
                    log_test("PATCH reject flow", 
                            action_rejected and status_rejected and pending_rejected and rejection_note,
                            f"action={data.get('action')}, status={data.get('order', {}).get('status')}, rejectionNote={data.get('order', {}).get('pendingApproval', {}).get('rejectionNote')}")
                else:
                    log_test("PATCH reject flow", False, f"Reject failed: {response.status_code}, Response: {response.text}")
            else:
                log_test("PATCH reject flow", False, f"Request approval failed: status={data.get('order', {}).get('status')}")
        else:
            log_test("PATCH reject flow", False, f"Request approval failed: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("PATCH reject flow", False, f"Exception: {str(e)}")

def test_error_handling(order_id):
    """Test error handling scenarios"""
    print("=== Testing Error Handling ===")
    
    try:
        # Test 1: PATCH with no orderId
        response = requests.patch(f"{BASE_URL}/orders/update", json={})
        if response.status_code == 400:
            log_test("PATCH with no orderId", True, "Returns 400 as expected")
        else:
            log_test("PATCH with no orderId", False, f"Expected 400, got {response.status_code}")
        
        # Test 2: PATCH with non-existent orderId
        response = requests.patch(f"{BASE_URL}/orders/update", json={
            "orderId": "ORD-DOESNOTEXIST",
            "lines": [{"skuId": "SKU-10842", "qty": 100}]
        })
        if response.status_code == 404:
            log_test("PATCH with non-existent orderId", True, "Returns 404 as expected")
        else:
            log_test("PATCH with non-existent orderId", False, f"Expected 404, got {response.status_code}")
        
        if order_id:
            # Test 3: PATCH with zero qty and bogus SKU
            response = requests.patch(f"{BASE_URL}/orders/update", json={
                "orderId": order_id,
                "simDay": 20,
                "lines": [
                    {"skuId": "SKU-10842", "qty": 0},
                    {"skuId": "BOGUS", "qty": 5}
                ]
            })
            if response.status_code == 400:
                data = response.json()
                error_mentions_zero = "At least one non-zero line" in data.get('error', '')
                log_test("PATCH with zero/invalid lines", error_mentions_zero, f"Error: {data.get('error', '')}")
            else:
                log_test("PATCH with zero/invalid lines", False, f"Expected 400, got {response.status_code}")
            
            # Test 4: PATCH approve when no pending approval (after reject)
            response = requests.patch(f"{BASE_URL}/orders/update", json={
                "orderId": order_id,
                "simDay": 20,
                "action": "approve"
            })
            if response.status_code == 400:
                data = response.json()
                error_mentions_no_pending = "No pending approval" in data.get('error', '')
                log_test("PATCH approve with no pending approval", error_mentions_no_pending, f"Error: {data.get('error', '')}")
            else:
                log_test("PATCH approve with no pending approval", False, f"Expected 400, got {response.status_code}")
            
            # Test 5: PATCH request_approval when NOT locked
            response = requests.patch(f"{BASE_URL}/orders/update", json={
                "orderId": order_id,
                "simDay": 20,
                "action": "request_approval",
                "lines": [{"skuId": "SKU-10842", "qty": 50}]
            })
            if response.status_code == 400:
                data = response.json()
                error_mentions_only_locked = "Approval is only needed when the order is locked" in data.get('error', '')
                log_test("PATCH request_approval when not locked", error_mentions_only_locked, f"Error: {data.get('error', '')}")
            else:
                log_test("PATCH request_approval when not locked", False, f"Expected 400, got {response.status_code}")
        else:
            log_test("Error handling tests (skipped)", False, "No order_id available")
            
    except Exception as e:
        log_test("Error handling tests", False, f"Exception: {str(e)}")

def test_regression():
    """Test that pre-existing endpoints still work"""
    print("=== Testing Regression ===")
    
    try:
        # Test 1: GET /api/data/meta
        response = requests.get(f"{BASE_URL}/data/meta")
        if response.status_code == 200:
            data = response.json()
            expected_counts = {
                'skuCount': 15,
                'distributorCount': 5,
                'regionCount': 3,
                'weekCount': 26,
                'rowCount': 1950
            }
            all_correct = all(data.get(k) == v for k, v in expected_counts.items())
            log_test("GET /api/data/meta", all_correct, f"Counts: {data}")
        else:
            log_test("GET /api/data/meta", False, f"Status: {response.status_code}")
        
        # Test 2: GET /api/orders/suggest
        response = requests.get(f"{BASE_URL}/orders/suggest?distributorId=DST-001")
        if response.status_code == 200:
            data = response.json()
            has_15_lines = len(data.get('lines', [])) == 15
            log_test("GET /api/orders/suggest", has_15_lines, f"Lines count: {len(data.get('lines', []))}")
        else:
            log_test("GET /api/orders/suggest", False, f"Status: {response.status_code}")
        
        # Test 3: POST /api/orders/place still returns order with lockState
        order_data = {
            "distributorId": "DST-001",
            "lines": [{"skuId": "SKU-10842", "qty": 25}]
        }
        response = requests.post(f"{BASE_URL}/orders/place", json=order_data)
        if response.status_code == 201:
            data = response.json()
            has_lock_state = 'lockState' in data.get('order', {})
            log_test("POST /api/orders/place with lockState", has_lock_state, f"lockState present: {has_lock_state}")
        else:
            log_test("POST /api/orders/place with lockState", False, f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Regression tests", False, f"Exception: {str(e)}")

def main():
    """Run all tests in order"""
    print("Starting Order Freeze Logic Backend Tests")
    print("=" * 50)
    
    # Test 1: GET /api/orders/rules
    test_orders_rules()
    
    # Test 2: Seed a fresh order
    order_id = seed_fresh_order()
    
    # Test 3: GET /api/orders with simDay
    test_orders_list_with_simday()
    
    # Test 4: PATCH editable
    test_patch_editable(order_id)
    
    # Test 5: PATCH restricted OK
    test_patch_restricted_ok(order_id)
    
    # Test 6: PATCH restricted violation
    test_patch_restricted_violation(order_id)
    
    # Test 7: PATCH locked edit
    test_patch_locked_edit(order_id)
    
    # Test 8: PATCH locked request approval
    test_patch_locked_request_approval(order_id)
    
    # Test 9: PATCH approve
    test_patch_approve(order_id)
    
    # Test 10: PATCH reject flow
    test_patch_reject_flow(order_id)
    
    # Test 11: Error handling
    test_error_handling(order_id)
    
    # Test 12: Regression
    test_regression()
    
    print("=" * 50)
    print("Order Freeze Logic Backend Tests Completed")

if __name__ == "__main__":
    main()