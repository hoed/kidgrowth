-- Create meal_plans table for storing saved meal plans
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  week_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  preferences TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view meal plans for their children"
ON public.meal_plans FOR SELECT
USING (EXISTS (
  SELECT 1 FROM children
  WHERE children.id = meal_plans.child_id
  AND children.user_id = auth.uid()
));

CREATE POLICY "Users can insert meal plans for their children"
ON public.meal_plans FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM children
  WHERE children.id = meal_plans.child_id
  AND children.user_id = auth.uid()
));

CREATE POLICY "Users can update meal plans for their children"
ON public.meal_plans FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM children
  WHERE children.id = meal_plans.child_id
  AND children.user_id = auth.uid()
));

CREATE POLICY "Users can delete meal plans for their children"
ON public.meal_plans FOR DELETE
USING (EXISTS (
  SELECT 1 FROM children
  WHERE children.id = meal_plans.child_id
  AND children.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_meal_plans_updated_at
BEFORE UPDATE ON public.meal_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();