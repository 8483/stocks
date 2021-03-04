select *
from (
	select 
		m.*,
		round((select avg(enterpriseToEbitda) from stocks.metrics x where x.industry = m.industry), 2) EtEAvg,
		round((enterpriseToEbitda / (select avg(enterpriseToEbitda) from stocks.metrics x where x.industry = m.industry) - 1) * 100, 0) EtEvsEtEAvgPercent,
		pricesOneDayAgo.adjustedClose closeOneDayAgo,
		pricesSevenDaysAgo.adjustedClose closeSevenDaysAgo,
		round((pricesOneDayAgo.adjustedClose / pricesSevenDaysAgo.adjustedClose - 1) * 100, 0) closeOneToSeven,
        case when regularMarketPreviousClose > fiftyDayAverage and currentPrice > regularMarketPreviousClose then 1 else 0 end jump,
        round((regularMarketPreviousClose / fiftyDayAverage - 1) * 100, 0) closeVs50avg
	from stocks.metrics m
		left join ( 
			SELECT symbol, date, adjustedClose, ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date desc) row_num FROM stocks.prices
		) pricesOneDayAgo on pricesOneDayAgo.symbol = m.symbol and pricesOneDayAgo.row_num = 1
		
		left join ( 
			SELECT symbol, date, adjustedClose, ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date desc) row_num FROM stocks.prices
		) pricesSevenDaysAgo on pricesSevenDaysAgo.symbol = m.symbol and pricesSevenDaysAgo.row_num = 7
) t1
-- where forecast / currentPrice > 1.3
-- where preMarketPrice / closeOneDayAgo > 1.0
-- where t1.jump > 50
-- where symbol = 'pltr'
-- where enterpriseToEbitda > 0
-- where symbol in ('ACI', 'AEL')

-- order by shortPercentOfFloat desc
order by enterpriseToEbitda asc