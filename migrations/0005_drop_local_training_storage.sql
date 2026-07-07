-- Training data (planned sessions, completed workouts) now lives entirely in
-- Nolio; the app no longer generates or mirrors its own plan.
DROP TABLE IF EXISTS `workout_logs`;
DROP TABLE IF EXISTS `workouts`;
DROP TABLE IF EXISTS `training_plans`;
