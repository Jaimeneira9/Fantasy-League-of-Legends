from market.pricing import MAX_DAILY_CHANGE_PCT, calculate_new_price


def test_outperforming_increases_price():
    new = calculate_new_price(100.0, recent_avg_points=50.0, baseline_avg_points=30.0, demand_ratio=1.0)
    assert new > 100.0


def test_underperforming_decreases_price():
    new = calculate_new_price(100.0, recent_avg_points=10.0, baseline_avg_points=30.0, demand_ratio=1.0)
    assert new < 100.0


def test_cap_positive():
    new = calculate_new_price(100.0, recent_avg_points=999.0, baseline_avg_points=1.0, demand_ratio=100.0)
    assert new == round(100.0 * (1 + MAX_DAILY_CHANGE_PCT), 2)


def test_cap_negative():
    new = calculate_new_price(100.0, recent_avg_points=0.0, baseline_avg_points=999.0, demand_ratio=0.01)
    assert new == round(100.0 * (1 - MAX_DAILY_CHANGE_PCT), 2)


def test_equilibrium_no_change():
    # performance_factor=0, demand_factor=log(1)*0.1=0 → no change
    new = calculate_new_price(100.0, recent_avg_points=30.0, baseline_avg_points=30.0, demand_ratio=1.0)
    assert new == 100.0


def test_zero_baseline_no_crash():
    new = calculate_new_price(100.0, recent_avg_points=50.0, baseline_avg_points=0.0, demand_ratio=1.0)
    assert isinstance(new, float)


def test_high_demand_increases_price():
    new_high = calculate_new_price(100.0, recent_avg_points=30.0, baseline_avg_points=30.0, demand_ratio=5.0)
    new_low = calculate_new_price(100.0, recent_avg_points=30.0, baseline_avg_points=30.0, demand_ratio=0.5)
    assert new_high > new_low


def test_result_is_rounded_to_two_decimals():
    new = calculate_new_price(100.0, recent_avg_points=35.0, baseline_avg_points=30.0, demand_ratio=1.2)
    assert new == round(new, 2)