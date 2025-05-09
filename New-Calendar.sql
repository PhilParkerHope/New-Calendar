SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[api_Custom_LCOH_Calendar_List_Filter_v2]
    @DomainID int,
    @CongregationID nvarchar(256),
    @TagList nvarchar(256) = NULL,
    @DetailUrl nvarchar(256) = NULL,
    @StartDate nvarchar(256) = NULL,
    @EndDate nvarchar(256) = NULL,
    @SearchQuery nvarchar(256) = NULL
AS
BEGIN

    DECLARE @UsableStartDate date;
    DECLARE @UsableEndDate date;

    --SET @TagList = @DetailUrl;

    -- SET @CongregationID =
    --     CASE 
    --         WHEN @CongregationID IS NULL THEN SUBSTRING((
    --                 SELECT
    --                     CONCAT(',', Congregations.Congregation_ID) AS [text()]
    --                 FROM Congregations
    --                 WHERE Congregations.Online_Sort_Order IS NOT NULL
    --                     AND Congregations.Location_ID IS NOT NULL
    --                 FOR XML PATH (''), TYPE).value('text()[1]','nvarchar(max)'), 2, 1000)
    --         ELSE @CongregationID
    --     END;

    SET @UsableStartDate = 
    CASE 
        -- WHEN @StartDate = '1701324000' THEN CONVERT(date, GETDATE())
        WHEN ISDATE(@StartDate) = 1 THEN @StartDate
        WHEN ISDATE(DATEADD(MILLISECOND, CAST(@StartDate + '000' AS bigint) % 1000, DATEADD(SECOND, CAST(@StartDate + '000' AS bigint) / 1000, '19700101'))) = 1 THEN CAST(DATEADD(MILLISECOND, CAST(@StartDate + '000' AS bigint) % 1000, DATEADD(SECOND, CAST(@StartDate + '000' AS bigint) / 1000, '19700101')) AS date)
        ELSE CONVERT(date, GETDATE())
    END;

    SET @UsableEndDate = 
    CASE 
        WHEN @StartDate = @EndDate THEN @UsableStartDate
        WHEN ISDATE(@EndDate) = 1 THEN @EndDate
        WHEN ISDATE(DATEADD(MILLISECOND, CAST(@EndDate + '000' AS bigint) % 1000, DATEADD(SECOND, CAST(@EndDate + '000' AS bigint) / 1000, '19700101'))) = 1 THEN CAST(DATEADD(MILLISECOND, CAST(@EndDate + '000' AS bigint) % 1000, DATEADD(SECOND, CAST(@EndDate + '000' AS bigint) / 1000, '19700101')) AS date)
        ELSE DATEADD(day, 7, CONVERT(date, @UsableStartDate))
    END;

    WITH
        eventDates
        as
        (
                            Select @UsableStartDate as dateValue
            UNION ALL
                SELECT DATEADD(day, 1, dateValue)
                FROM eventDates
                WHERE DATEADD(day, 1, dateValue) <= @UsableEndDate
        )
       


    -- DataSet 1
SELECT
    eventDates.dateValue AS Date_Number,
    DATENAME(WEEKDAY, eventDates.dateValue) + ', ' +
    CASE 
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'January' THEN 'Jan. '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'February' THEN 'Feb. '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'March' THEN 'Mar. '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'April' THEN 'April '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'May' THEN 'May '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'June' THEN 'June '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'July' THEN 'July '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'August' THEN 'Aug. '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'September' THEN 'Sept. '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'October' THEN 'Oct. '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'November' THEN 'Nov. '
        WHEN DATENAME(MONTH, eventDates.dateValue) = 'December' THEN 'Dec. '
    END +
    CAST(DATEPART(DAY, eventDates.dateValue) AS NVARCHAR) AS Date_Text
FROM eventDates
ORDER BY eventDates.dateValue ASC
OPTION (MAXRECURSION 0);

    --DataSet 2
    -- Step 1: Get distinct Event_IDs based on filters
    WITH
        DistinctEvents
        AS
        (
            SELECT DISTINCT Events.Event_ID
            FROM Events
                LEFT JOIN dp_Split(@CongregationID, ',') AS CongregationIDs ON Events.Congregation_ID = CongregationIDs.Item
            WHERE Events.Event_Start_Date >= @UsableStartDate
                AND Events.Event_Start_Date < DATEADD(DAY, 1, @UsableEndDate)
                AND (@CongregationID IS NULL OR @CongregationID = '' OR Events.Congregation_ID = CongregationIDs.Item)
                AND (
    NULLIF(LTRIM(RTRIM(@TagList)), '') IS NULL
    OR EXISTS (
        SELECT 1
        FROM Event_Tags ET
        JOIN dp_Split(@TagList, ',') Tags ON Tags.Item = ET.Tag_ID
        WHERE ET.Event_ID = Events.Event_ID
    )
)

                AND (@SearchQuery IS NULL OR @SearchQuery = '' OR UPPER(Events.Event_Title + ' ' + Events.[Description] + ' ' + Events.Meeting_Instructions) LIKE '%' + UPPER(@SearchQuery) + '%')
                AND Events.Visibility_Level_ID = 4
                AND Events._Web_Approved = 1
                AND Events._Approved = 1
                AND Events.Cancelled = 0
                
        )

    -- Step 2: Join back to get full data
    SELECT
        CONVERT(date, E.Event_Start_Date) AS Date_Number,
        E.Event_Title,
        E.Event_ID,
        E.Event_Start_Date,
        (
    SELECT STUFF((
        SELECT ',' + CONVERT(varchar, ET.Tag_ID)
        FROM Event_Tags ET
        WHERE ET.Event_ID = E.Event_ID
        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '')
) AS Event_Tags,
        LOWER(FORMAT(E.Event_Start_Date, 'h:mm tt')) AS Start_Time,
        CONCAT(DATENAME(WEEKDAY, E.Event_Start_Date), ', ', LEFT(CONVERT(varchar, E.Event_Start_Date, 100), 3), ' ', DATEPART(day, E.Event_Start_Date)) AS Pretty_Date,
        L.Location_Name,
        (
        SELECT TOP(1)
            R.Room_Name
        FROM Event_Rooms ER
            INNER JOIN Rooms R ON R.Room_ID = ER.Room_ID
        WHERE ER.Event_ID = E.Event_ID
            AND ER.Default_Group_Room = 1
    ) AS Event_Room,
        COALESCE(
        'https://my.lutheranchurchofhope.org/ministryplatformapi/files/' + CAST(EventFiles.Unique_Name AS nvarchar(50)),
        'https://my.lutheranchurchofhope.org/ministryplatformapi/files/' + CAST(ProgramFiles.Unique_Name AS nvarchar(50)),
        'https://storage.sardius.media/4a21dB135a01F14/archives/6D8BFE45ADA74A9647EED4B9D22684D14a21dB135a01F14/images/3bA43035949F5AF.jpg'
    ) AS Event_Image_Url
    FROM DistinctEvents DE
        JOIN Events E ON E.Event_ID = DE.Event_ID
        JOIN Locations L ON L.Location_ID = E.Location_ID
        LEFT JOIN Programs P ON P.Program_ID = E.Program_ID
        LEFT JOIN (
    SELECT File_ID, Record_ID, Unique_Name
        FROM dp_Files
        WHERE LOWER(Table_Name) = 'events'
            AND Extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
            AND Default_Image = 1
) AS EventFiles ON EventFiles.Record_ID = E.Event_ID



        LEFT JOIN (
    SELECT *
        FROM dp_Files
        WHERE Table_Name = 'Programs' AND Extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
) AS ProgramFiles ON ProgramFiles.Record_ID = E.Program_ID
    ORDER BY E.Event_Start_Date ASC, E.Event_Title DESC;


    --DataSet 3
    SELECT
        Tags.Tag_ID
    , CASE
        WHEN Tags.Web_Name IS NOT NULL THEN Tags.Web_Name
        ELSE Tags.Tag_Name
    END AS Tag_Name
    , CASE
        WHEN Tags.Tag_ID = TagIDs.Item THEN 1
        ELSE 0
    END AS Selected
    FROM Tags
        LEFT JOIN dp_Split(@TagList, ',') AS TagIDs ON Tags.Tag_ID = TagIDs.Item
    WHERE Tags.Available_Online = 1
    ORDER BY CASE WHEN Tags.Web_Name IS NOT NULL THEN Tags.Web_Name ELSE Tags.Tag_Name END ASC;

    --DataSet 4
    SELECT
        Congregations.Congregation_ID
    , Congregations.Congregation_Name
    , CASE
        WHEN Congregations.Congregation_ID = CongregationIDs.Item THEN 1
        ELSE 0
    END AS Selected
    FROM Congregations
        LEFT JOIN dp_Split(@CongregationID, ',') AS CongregationIDs ON Congregations.Congregation_ID = CongregationIDs.Item
    WHERE Congregations.Online_Sort_Order IS NOT NULL
        AND Congregations.Location_ID IS NOT NULL
    ORDER BY CASE WHEN Congregations.Congregation_ID = 10 THEN 'AAA' ELSE REPLACE(Congregations.Congregation_Name, '+', ' ') END ASC;

END
GO
