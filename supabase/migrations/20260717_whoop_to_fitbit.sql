-- Migração: renomear schema whoop → fitbit e colunas relacionadas
-- Execute no painel do Supabase: SQL Editor

-- 1. Renomear o schema
ALTER SCHEMA whoop RENAME TO fitbit;

-- 2. Renomear coluna whoop_user_id → fitbit_user_id em user_tokens
ALTER TABLE fitbit.user_tokens RENAME COLUMN whoop_user_id TO fitbit_user_id;

-- 3. Renomear coluna whoop_user_id → fitbit_user_id em profiles
ALTER TABLE fitbit.profiles RENAME COLUMN whoop_user_id TO fitbit_user_id;

-- 4. Renomear coluna whoop_cycle_id → fitbit_activity_id em cycles
ALTER TABLE fitbit.cycles RENAME COLUMN whoop_cycle_id TO fitbit_activity_id;

-- 5. Renomear coluna whoop_sleep_id → fitbit_sleep_id em sleep
ALTER TABLE fitbit.sleep RENAME COLUMN whoop_sleep_id TO fitbit_sleep_id;

-- 6. Renomear coluna whoop_workout_id → fitbit_workout_id em workouts
ALTER TABLE fitbit.workouts RENAME COLUMN whoop_workout_id TO fitbit_workout_id;

-- 7. Atualizar constraint de unicidade em cycles (se existir)
-- Pode variar dependendo de como foi criada a constraint original.
-- Se necessário, recriar a constraint unique em fitbit_activity_id:
-- ALTER TABLE fitbit.cycles DROP CONSTRAINT IF EXISTS cycles_whoop_cycle_id_key;
-- ALTER TABLE fitbit.cycles ADD CONSTRAINT cycles_fitbit_activity_id_key UNIQUE (fitbit_activity_id);

-- 8. Atualizar as políticas RLS se houver referências ao schema antigo
-- As políticas do schema 'whoop' são migradas automaticamente com o rename do schema.
