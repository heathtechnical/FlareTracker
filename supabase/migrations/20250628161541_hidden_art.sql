/*
  # Seed fabricated check-in data for the last 6 months

  1. Purpose
    - Generate realistic check-in data for existing users
    - Create condition entries with severity patterns
    - Generate medication entries with realistic adherence
    - Include lifestyle factors and seasonal variations

  2. Safety Features
    - Only creates data for dates without existing check-ins
    - Respects existing foreign key relationships
    - Includes realistic patterns and correlations

  3. Data Patterns
    - 85% check-in completion rate (15% random skips)
    - Severity influenced by stress and sleep quality
    - Seasonal variations (worse in winter months)
    - Realistic medication adherence rates
*/

DO $$
DECLARE
    user_record RECORD;
    condition_record RECORD;
    medication_record RECORD;
    check_in_date DATE;
    current_check_in_id UUID;  -- Renamed to avoid ambiguity
    base_severity INTEGER;
    daily_severity INTEGER;
    stress_level INTEGER;
    sleep_quality INTEGER;
    water_intake INTEGER;
    diet_quality INTEGER;
    should_skip BOOLEAN;
    medication_taken BOOLEAN;
    symptom_count INTEGER;
    symptoms_array TEXT[];
    available_symptoms TEXT[] := ARRAY['Itchiness', 'Redness', 'Dryness', 'Flaking', 'Pain', 'Swelling', 'Burning', 'Bleeding'];
    sample_notes TEXT[] := ARRAY[
        'Feeling much better today',
        'Noticed some improvement after using moisturizer',
        'Stress at work might be affecting my skin',
        'Weather has been very dry lately',
        'Had a good night sleep, skin feels calmer',
        'Applied medication as prescribed',
        'Skin feels irritated after trying new soap',
        'Exercise seemed to help with stress levels'
    ];
    weather_conditions TEXT[] := ARRAY['Humid', 'Dry', 'Hot', 'Cold', 'Rainy', 'Windy'];
    i INTEGER;
    j INTEGER;
    existing_checkin_count INTEGER;
    avg_severity NUMERIC;
BEGIN
    -- Loop through all existing users
    FOR user_record IN SELECT id FROM users LOOP
        RAISE NOTICE 'Generating data for user: %', user_record.id;
        
        -- Generate check-ins for the last 6 months (180 days)
        FOR i IN 0..179 LOOP
            check_in_date := CURRENT_DATE - INTERVAL '1 day' * i;
            
            -- Check if check-in already exists for this user and date
            SELECT COUNT(*) INTO existing_checkin_count 
            FROM check_ins 
            WHERE user_id = user_record.id AND date = check_in_date;
            
            -- Only proceed if no check-in exists for this date
            IF existing_checkin_count = 0 THEN
                -- Skip some days randomly (simulate realistic usage - about 15% skip rate)
                should_skip := random() < 0.15;
                
                IF NOT should_skip THEN
                    -- Generate lifestyle factors that influence skin condition
                    stress_level := CASE 
                        WHEN random() < 0.3 THEN 1 + floor(random() * 2)  -- 30% low stress (1-2)
                        WHEN random() < 0.7 THEN 2 + floor(random() * 2)  -- 40% medium stress (2-3)
                        ELSE 3 + floor(random() * 3)                      -- 30% high stress (3-5)
                    END;
                    
                    sleep_quality := CASE 
                        WHEN random() < 0.4 THEN 3 + floor(random() * 3)  -- 40% good sleep (3-5)
                        WHEN random() < 0.8 THEN 2 + floor(random() * 2)  -- 40% medium sleep (2-3)
                        ELSE 1 + floor(random() * 2)                      -- 20% poor sleep (1-2)
                    END;
                    
                    water_intake := 2 + floor(random() * 4);  -- 2-5
                    diet_quality := 2 + floor(random() * 4);  -- 2-5
                    
                    -- Create the check-in record
                    INSERT INTO check_ins (
                        id,
                        user_id,
                        date,
                        notes,
                        factors,
                        created_at,
                        updated_at
                    ) VALUES (
                        gen_random_uuid(),
                        user_record.id,
                        check_in_date,
                        CASE WHEN random() < 0.3 THEN sample_notes[1 + floor(random() * array_length(sample_notes, 1))] ELSE NULL END,
                        jsonb_build_object(
                            'stress', stress_level,
                            'sleep', sleep_quality,
                            'water', water_intake,
                            'diet', diet_quality,
                            'weather', CASE WHEN random() < 0.6 THEN weather_conditions[1 + floor(random() * array_length(weather_conditions, 1))] ELSE NULL END
                        ),
                        check_in_date + INTERVAL '12 hours',
                        check_in_date + INTERVAL '12 hours'
                    ) RETURNING id INTO current_check_in_id;
                    
                    -- Generate condition entries for this check-in
                    FOR condition_record IN SELECT id FROM conditions WHERE user_id = user_record.id LOOP
                        -- Base severity influenced by stress and sleep
                        base_severity := CASE 
                            WHEN stress_level >= 4 OR sleep_quality <= 2 THEN 3 + floor(random() * 3)  -- High stress/poor sleep = worse symptoms
                            WHEN stress_level <= 2 AND sleep_quality >= 4 THEN 1 + floor(random() * 2)  -- Low stress/good sleep = better symptoms
                            ELSE 2 + floor(random() * 3)  -- Normal range
                        END;
                        
                        -- Add some seasonal variation (winter months slightly worse)
                        IF EXTRACT(MONTH FROM check_in_date) IN (12, 1, 2) THEN
                            base_severity := LEAST(5, base_severity + CASE WHEN random() < 0.3 THEN 1 ELSE 0 END);
                        END IF;
                        
                        daily_severity := GREATEST(1, LEAST(5, base_severity));
                        
                        -- Generate symptoms based on severity
                        symptom_count := CASE 
                            WHEN daily_severity <= 2 THEN floor(random() * 2)      -- 0-1 symptoms for mild
                            WHEN daily_severity <= 3 THEN floor(random() * 3)      -- 0-2 symptoms for moderate  
                            WHEN daily_severity <= 4 THEN 1 + floor(random() * 3)  -- 1-3 symptoms for severe
                            ELSE 2 + floor(random() * 3)                           -- 2-4 symptoms for extreme
                        END;
                        
                        symptoms_array := '{}';
                        FOR j IN 1..symptom_count LOOP
                            symptoms_array := array_append(symptoms_array, available_symptoms[1 + floor(random() * array_length(available_symptoms, 1))]);
                        END LOOP;
                        
                        -- Remove duplicates
                        IF array_length(symptoms_array, 1) > 0 THEN
                            SELECT array_agg(DISTINCT unnest) INTO symptoms_array FROM unnest(symptoms_array);
                        END IF;
                        
                        INSERT INTO condition_entries (
                            id,
                            check_in_id,
                            condition_id,
                            severity,
                            symptoms,
                            notes,
                            created_at
                        ) VALUES (
                            gen_random_uuid(),
                            current_check_in_id,
                            condition_record.id,
                            daily_severity,
                            COALESCE(symptoms_array, '{}'),
                            CASE WHEN random() < 0.2 THEN 'Additional notes about this condition' ELSE NULL END,
                            check_in_date + INTERVAL '12 hours'
                        );
                    END LOOP;
                    
                    -- Calculate average severity for medication decisions
                    SELECT AVG(severity) INTO avg_severity 
                    FROM condition_entries 
                    WHERE check_in_id = current_check_in_id;
                    
                    -- Generate medication entries for this check-in
                    FOR medication_record IN SELECT id, frequency FROM medications WHERE user_id = user_record.id AND active = true LOOP
                        -- Medication adherence varies by frequency type
                        medication_taken := CASE 
                            WHEN medication_record.frequency = 'As required' THEN 
                                -- PRN medications taken based on severity
                                COALESCE(avg_severity, 0) >= 3
                            WHEN medication_record.frequency ILIKE '%daily%' THEN 
                                random() < 0.80  -- 80% adherence for daily meds
                            WHEN medication_record.frequency = 'Weekly' THEN 
                                random() < 0.85  -- 85% adherence for weekly meds
                            ELSE 
                                random() < 0.75  -- 75% adherence for other frequencies
                        END;
                        
                        INSERT INTO medication_entries (
                            id,
                            check_in_id,
                            medication_id,
                            taken,
                            times_taken,
                            skipped_reason,
                            created_at
                        ) VALUES (
                            gen_random_uuid(),
                            current_check_in_id,
                            medication_record.id,
                            medication_taken,
                            CASE WHEN medication_taken THEN 
                                CASE 
                                    WHEN medication_record.frequency ILIKE '%twice%' THEN 1 + floor(random() * 2)
                                    WHEN medication_record.frequency ILIKE '%three%' THEN 1 + floor(random() * 3)
                                    ELSE 1
                                END
                            ELSE NULL END,
                            CASE WHEN NOT medication_taken AND medication_record.frequency != 'As required' THEN 
                                CASE floor(random() * 4)
                                    WHEN 0 THEN 'Forgot'
                                    WHEN 1 THEN 'Side effects'
                                    WHEN 2 THEN 'Not needed'
                                    ELSE 'Other'
                                END
                            ELSE NULL END,
                            check_in_date + INTERVAL '12 hours'
                        );
                    END LOOP;
                END IF;
            ELSE
                RAISE NOTICE 'Check-in already exists for user % on date %, skipping...', user_record.id, check_in_date;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Seed data generation completed successfully!';
END $$;