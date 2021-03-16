-- import prices
select
	symbol,
    date,
    adjustedClose,
    volume
from stocks.prices
order by 
	symbol asc, 
    date desc;


-- metrics analysis
select 
	m.*,
	case when regularMarketPreviousClose > fiftyDayAverage and currentPrice > regularMarketPreviousClose then 1 else 0 end jump,
	round((regularMarketPreviousClose / fiftyDayAverage - 1) * 100, 0) closeVs50avg,
    industryAverages.tickersCount,
    trailingPe,
    industryAverages.trailingPeAvg,
    forwardPe,
	industryAverages.forwardPeAvg,
    pegRatio,
	industryAverages.pegRatioAvg,
    
    enterpriseToEbitda,
	industryAverages.enterpriseToEbitdaAvg,
    round((marketCap / ebitda), 2) marketCapToEbitda,
    round((marketCap / enterpriseValue - 1) * 100, 0) marketCapToEnterprise,
    enterpriseToEbitda / industryAverages.enterpriseToEbitdaAvg score,
    
	m.industry,
    
    format(marketCap, 0) marketCap,
    format(industryMaxes.marketCapMax, 0) marketCapMax,
    round((marketCap / industryMaxes.marketCapMax), 2) marketCapSize,
    
    format(enterpriseValue, 0) enterpriseValue,
    format(industryMaxes.enterpriseValueMax, 0) enterpriseValueMax,
    round((enterpriseValue / industryMaxes.enterpriseValueMax), 2) enterpriseSize,
    
    format(ebitda, 0) ebitda,
    format(industryMaxes.ebitdaMax, 0) ebitdaMax,
    round((ebitda / industryMaxes.ebitdaMax), 2) ebitdaSize
from stocks.metrics m

	left join (
		select
			industry,
			count(symbol) tickersCount,
			round(avg(trailingPe), 2) trailingPeAvg,
			round(avg(forwardPe), 2) forwardPeAvg,
			round(avg(pegRatio), 2) pegRatioAvg,
			round(avg(enterpriseToEbitda), 2) enterpriseToEbitdaAvg
		from stocks.metrics
		where enterpriseValue > 0 and enterpriseToEbitda > 0
		group by industry
    ) industryAverages on industryAverages.industry = m.industry
    
    left join (
		select
			industry,
			round(max(marketCap), 2) marketCapMax,
			round(max(enterpriseValue), 2) enterpriseValueMax,
			round(max(ebitda), 2) ebitdaMax
		from stocks.metrics
		where marketCap > 0 and enterpriseValue > 0 and ebitda > 0
		group by industry
    ) industryMaxes on industryMaxes.industry = m.industry
    
where 
	enterpriseValue > 0 and enterpriseToEbitda > 0
    and earningsQuarterlyGrowthYoy > 0.5
    and round((regularMarketPreviousClose / fiftyDayAverage - 1) * 100, 0) between 5 and 10
    and enterpriseToEbitda / industryAverages.enterpriseToEbitdaAvg < 0.6
    and round((marketCap / enterpriseValue - 1) * 100, 0) between -100 and -20
    and enterpriseToEbitda < 7
    and marketCap / ebitda < 7
order by score asc


-- price analysis
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
where symbol in ('NVDA', 'BB', 'CRSP', 'TSM')
-- order by shortPercentOfFloat desc
order by enterpriseToEbitda asc