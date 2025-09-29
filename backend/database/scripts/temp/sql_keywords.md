Great question! Let me explain the SQL keywords and concepts that might be new
or less familiar from the code:

## **JSON Functions (MariaDB 10.2+)**
```sql
JSON_OBJECT('key1', value1, 'key2', value2)
JSON_EXTRACT(json_column, '$.key')
```
- **JSON_OBJECT**: Creates a JSON object from key-value pairs
- **JSON_EXTRACT**: Extracts values from JSON data using path syntax
- Used for storing flexible data in the activity log (old/new values)

## **IFNULL vs NULLIF**
```sql
IFNULL(p_is_admin, FALSE)  -- If p_is_admin is NULL, return FALSE
NULLIF(COUNT(t.id_task), 0)  -- If count is 0, return NULL (avoids division by zero)
```
- **IFNULL**: Returns second value if first is NULL
- **NULLIF**: Returns NULL if both values are equal

## **FIELD() Function**
```sql
ORDER BY FIELD(timeline_status, 'OVERDUE', 'CURRENT', 'UPCOMING', 'NO_DEADLINE')
```
- **FIELD()**: Returns the position of the first value in the list
- Creates custom sort orders (OVERDUE=1, CURRENT=2, etc.)
- Very useful for priority-based sorting

## **Advanced CASE Statements**
```sql
CASE 
    WHEN t.end_date < NOW() AND t.status NOT IN ('COMPLETED', 'CANCELLED') THEN 'OVERDUE'
    WHEN t.start_date <= NOW() AND t.end_date >= NOW() THEN 'CURRENT'
    ELSE 'NO_DEADLINE'
END as timeline_status
```
- Creates calculated columns based on complex conditions
- Can be used in SELECT, WHERE, ORDER BY

## **COUNT with CASE (Conditional Aggregation)**
```sql
COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completed_tasks
COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id_task END) as completed_tasks
```
- Counts only rows matching a condition
- **DISTINCT** ensures we don't double-count in JOINs

## **GROUP_CONCAT**
```sql
GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as assigned_users
```
- **GROUP_CONCAT**: Combines multiple rows into a single string
- **DISTINCT**: Removes duplicates
- **ORDER BY**: Sorts before concatenating
- **SEPARATOR**: Custom delimiter (default is comma)

## **INSERT IGNORE**
```sql
INSERT IGNORE INTO ProjectFile (id_project, id_file) VALUES (1, 1);
```
- **INSERT IGNORE**: Silently ignores duplicate key errors
- Useful for "insert if not exists" scenarios

## **REGEXP (Regular Expressions)**
```sql
IF p_email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
```
- **REGEXP**: Pattern matching using regular expressions
- Used here for email validation
- `^` = start, `$` = end, `+` = one or more, etc.

## **Error Handling**
```sql
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
    ROLLBACK;
    RESIGNAL;
END;
```
- **DECLARE EXIT HANDLER**: Catches SQL exceptions
- **SQLEXCEPTION**: Any SQL error
- **RESIGNAL**: Re-throws the error after handling

## **SIGNAL (Custom Errors)**
```sql
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Custom error message';
```
- **SIGNAL**: Throws a custom error
- **SQLSTATE '45000'**: User-defined error code
- **MESSAGE_TEXT**: Custom error message

## **Complex JOINs with Multiple Aliases**
```sql
LEFT JOIN TaskAssignment ta1 ON t.id_task = ta1.id_task AND ta1.id_user = p_filter_user_id
LEFT JOIN TaskAssignment ta2 ON t.id_task = ta2.id_task AND ta2.id_user != p_user_id
```
- Same table joined multiple times with different aliases
- Each alias can have different conditions

## **Subqueries in CASE**
```sql
CASE al.entity_type
    WHEN 'USER' THEN (SELECT name FROM User WHERE id_user = al.entity_id)
    WHEN 'PROJECT' THEN (SELECT title FROM Project WHERE id_project = al.entity_id)
END as entity_name
```
- Subqueries within CASE statements
- Dynamic lookups based on entity type

These features make the procedures more robust, flexible, and user-friendly
while maintaining data integrity and providing rich functionality for the
    project management system.
