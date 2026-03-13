"""
Motor de precios dinámicos del mercado.

Variables: rendimiento reciente + demanda/oferta + momentum.
Cap: ±15% diario.
Updates: post-partido y cron a medianoche.
"""

MAX_DAILY_CHANGE_PCT = 0.15  # ±15% máximo por día


def calculate_new_price(
    current_price: float,
    recent_avg_points: float,
    baseline_avg_points: float,
    demand_ratio: float,  # compradores / vendedores (1.0 = equilibrado)
) -> float:
    """
    Calcula el nuevo precio de un jugador.

    Args:
        current_price: Precio actual en DB (fuente de verdad).
        recent_avg_points: Media de puntos últimos 3 partidos.
        baseline_avg_points: Media histórica del jugador.
        demand_ratio: Ratio de demanda en el mercado.

    Returns:
        Nuevo precio redondeado a 2 decimales.
    """
    # Factor rendimiento: cuánto se desvía del baseline
    if baseline_avg_points == 0:
        performance_factor = 0.0
    else:
        performance_factor = (recent_avg_points - baseline_avg_points) / baseline_avg_points

    # Factor demanda (logarítmico para suavizar extremos)
    import math
    demand_factor = math.log(max(demand_ratio, 0.1)) * 0.1

    raw_change = (performance_factor * 0.7 + demand_factor * 0.3)

    # Aplicar cap ±15%
    capped_change = max(-MAX_DAILY_CHANGE_PCT, min(MAX_DAILY_CHANGE_PCT, raw_change))

    new_price = current_price * (1 + capped_change)
    return round(new_price, 2)
