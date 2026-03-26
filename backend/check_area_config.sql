SELECT 
  area_name, 
  display_name,
  allowed_content_types,
  pg_typeof(allowed_content_types) as data_type,
  is_active,
  allow_user_selection
FROM advertisement_area_configs 
WHERE area_name LIKE 'mobile%' 
ORDER BY area_name;
