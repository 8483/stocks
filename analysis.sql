-- inserted prices
SELECT distinct symbol 
FROM stocks.prices;

-- import prices
select
	symbol,    
	date,    
	close,    
	volume
from (
	select	
		ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) rowNumber,
		symbol,    
		date,    
		close,    
		volume
		-- , timestamp
		-- , id
	from stocks.prices
) t1
where rowNumber <= 53
-- where id > 274424
order by 	
    symbol asc,     
    date desc;

-- leaders
select 
	symbol
from (
	SELECT 
		*,
		ROW_NUMBER() OVER (PARTITION BY industry ORDER BY marketCap DESC) rowNumber
	FROM stocks.metrics
) t1
where rowNumber = 1
order by marketCap desc

-- last price dates
select 
	symbol,
	date
from (
	SELECT
		symbol,
		date,
		ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) rowNumber
	FROM stocks.prices
) t1
where rowNumber = 1;