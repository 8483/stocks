select 
	*,
	round((regularMarketPreviousClose / fiftyDayAverage - 1) * 100, 0) delta,
    round((select avg(enterpriseToEbitda) from stocks.metrics x where x.industry = m.industry), 2) EtEAvg,
    enterpriseToEbitda,
    round((enterpriseToEbitda / (select avg(enterpriseToEbitda) from stocks.metrics x where x.industry = m.industry) - 1) * 100, 0) EtEvsEtEAvgPercent
from stocks.metrics m
