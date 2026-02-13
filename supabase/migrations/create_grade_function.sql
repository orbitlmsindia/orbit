
-- Create a function to grade a quiz attempt
CREATE OR REPLACE FUNCTION grade_quiz_attempt(attempt_uuid UUID)
RETURNS FLOAT AS $$
DECLARE
  v_score FLOAT := 0;
  v_total_points FLOAT := 0;
  v_assignment_id UUID;
  v_student_id UUID;
  rec RECORD;
BEGIN
  -- Get attempt details
  SELECT assignment_id, student_id INTO v_assignment_id, v_student_id
  FROM quiz_attempts WHERE id = attempt_uuid;

  -- Loop through answers and check correctness
  FOR rec IN
    SELECT 
      qa.id as answer_id,
      qa.answer_text,
      aq.correct_answer,
      aq.points
    FROM quiz_answers qa
    JOIN assignment_questions aq ON qa.question_id = aq.id
    WHERE qa.attempt_id = attempt_uuid
  LOOP
    -- Simple text match (case-insensitive trim)
    IF TRIM(LOWER(rec.answer_text)) = TRIM(LOWER(rec.correct_answer)) THEN
      v_score := v_score + rec.points;
      -- Update individual answer correctness
      UPDATE quiz_answers SET is_correct = TRUE, points_awarded = rec.points WHERE id = rec.answer_id;
    ELSE
      UPDATE quiz_answers SET is_correct = FALSE, points_awarded = 0 WHERE id = rec.answer_id;
    END IF;
  END LOOP;

  -- Update Attempt Score
  UPDATE quiz_attempts SET score = v_score WHERE id = attempt_uuid;

  -- Calculate Total Possible Points for percentage
  SELECT SUM(points) INTO v_total_points FROM assignment_questions WHERE assignment_id = v_assignment_id;

  -- If total points > 0, return percentage, else return raw score
  IF v_total_points > 0 THEN
      RETURN (v_score / v_total_points) * 100;
  ELSE
      RETURN v_score;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
