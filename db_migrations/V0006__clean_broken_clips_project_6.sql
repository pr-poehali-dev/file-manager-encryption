
UPDATE t_p96267657_video_editor_creatio.projects
SET project_data = jsonb_set(
  jsonb_set(
    project_data,
    '{tracks}',
    (
      SELECT jsonb_agg(
        jsonb_set(
          track,
          '{clips}',
          COALESCE(
            (SELECT jsonb_agg(clip) 
             FROM jsonb_array_elements(track->'clips') clip 
             WHERE clip->>'assetId' LIKE 'server_%' OR clip->>'assetId' IS NULL),
            '[]'::jsonb
          )
        )
      )
      FROM jsonb_array_elements(project_data->'tracks') track
    )
  ),
  '{assets}',
  COALESCE(
    (SELECT jsonb_agg(asset) 
     FROM jsonb_array_elements(project_data->'assets') asset 
     WHERE asset->>'id' LIKE 'server_%'),
    '[]'::jsonb
  )
)
WHERE id = 6;
