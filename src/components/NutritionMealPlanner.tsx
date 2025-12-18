import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, 
  Loader2, 
  Sparkles, 
  Sun, 
  Cloud, 
  Moon,
  Cookie,
  RefreshCw,
  Calendar,
  Apple,
  Carrot,
  Egg,
  Fish,
  Milk,
  Heart,
  History,
  Save,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface NutritionMealPlannerProps {
  childId: string;
  childName: string;
  ageMonths: number;
}

interface Meal {
  name: string;
  description: string;
  nutrients: string;
}

interface Snack {
  name: string;
  description: string;
}

interface DayMeals {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Snack[];
}

interface DayPlan {
  day: string;
  meals: DayMeals;
}

interface MealPlan {
  weekPlan: DayPlan[];
  tips: string[];
}

interface SavedMealPlan {
  id: string;
  child_id: string;
  plan_data: MealPlan;
  is_favorite: boolean;
  week_start_date: string;
  preferences: string | null;
  created_at: string;
}

const mealIcons: Record<string, React.ReactNode> = {
  breakfast: <Sun className="w-4 h-4 text-amber-500" />,
  lunch: <Cloud className="w-4 h-4 text-blue-500" />,
  dinner: <Moon className="w-4 h-4 text-indigo-500" />,
  snacks: <Cookie className="w-4 h-4 text-orange-500" />,
};

const foodIcons = [Apple, Carrot, Egg, Fish, Milk];

const dayColors: Record<string, string> = {
  'Senin': 'from-red-500/20 to-red-600/10 border-red-500/30',
  'Selasa': 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  'Rabu': 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  'Kamis': 'from-green-500/20 to-green-600/10 border-green-500/30',
  'Jumat': 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  'Sabtu': 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
  'Minggu': 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
};

export const NutritionMealPlanner = ({ childId, childName, ageMonths }: NutritionMealPlannerProps) => {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [selectedDay, setSelectedDay] = useState('Senin');
  const [historyOpen, setHistoryOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSavedPlans();
  }, [childId]);

  const fetchSavedPlans = async () => {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Cast the data properly
      const plans = data.map(item => ({
        ...item,
        plan_data: item.plan_data as unknown as MealPlan
      })) as SavedMealPlan[];
      setSavedPlans(plans);
    }
  };

  const generateMealPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: {
          ageMonths,
          preferences,
          childName,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setMealPlan(data);
      setCurrentPlanId(null);
      setIsFavorite(false);
      toast({
        title: 'Berhasil!',
        description: 'Rencana makan mingguan telah dibuat',
      });
    } catch (error: unknown) {
      console.error('Error generating meal plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Silakan coba lagi';
      toast({
        title: 'Gagal membuat rencana makan',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveMealPlan = async () => {
    if (!mealPlan) return;

    setSaving(true);
    try {
      const planDataJson = JSON.parse(JSON.stringify(mealPlan));
      
      if (currentPlanId) {
        // Update existing
        const { error } = await supabase
          .from('meal_plans')
          .update({ 
            plan_data: planDataJson,
            preferences,
            is_favorite: isFavorite
          })
          .eq('id', currentPlanId);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('meal_plans')
          .insert({
            child_id: childId,
            plan_data: planDataJson,
            preferences,
            is_favorite: isFavorite,
            week_start_date: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentPlanId(data.id);
      }

      await fetchSavedPlans();
      toast({
        title: 'Tersimpan!',
        description: 'Rencana makan berhasil disimpan',
      });
    } catch (error: unknown) {
      console.error('Error saving meal plan:', error);
      toast({
        title: 'Gagal menyimpan',
        description: 'Silakan coba lagi',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = async () => {
    const newFavorite = !isFavorite;
    setIsFavorite(newFavorite);

    if (currentPlanId) {
      await supabase
        .from('meal_plans')
        .update({ is_favorite: newFavorite })
        .eq('id', currentPlanId);
      await fetchSavedPlans();
    }
  };

  const loadPlan = (plan: SavedMealPlan) => {
    setMealPlan(plan.plan_data);
    setCurrentPlanId(plan.id);
    setIsFavorite(plan.is_favorite);
    setPreferences(plan.preferences || '');
    setHistoryOpen(false);
    toast({
      title: 'Rencana dimuat',
      description: `Rencana dari ${format(new Date(plan.created_at), 'd MMM yyyy', { locale: localeId })}`,
    });
  };

  const deletePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', planId);

    if (!error) {
      await fetchSavedPlans();
      if (currentPlanId === planId) {
        setMealPlan(null);
        setCurrentPlanId(null);
      }
      toast({
        title: 'Dihapus',
        description: 'Rencana makan berhasil dihapus',
      });
    }
  };

  const getRandomFoodIcon = (index: number) => {
    const Icon = foodIcons[index % foodIcons.length];
    return <Icon className="w-8 h-8 text-primary/60" />;
  };

  const currentDayPlan = mealPlan?.weekPlan.find(d => d.day === selectedDay);
  const favoritePlans = savedPlans.filter(p => p.is_favorite);

  return (
    <Card className="shadow-card border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Utensils className="w-5 h-5" />
            </div>
            Perencana Makan Mingguan
          </CardTitle>
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <History className="w-4 h-4 mr-1" />
                Riwayat
                {savedPlans.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-white/20">
                    {savedPlans.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Riwayat Rencana Makan</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[400px]">
                {savedPlans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Belum ada rencana tersimpan</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {favoritePlans.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                          Favorit
                        </p>
                        {favoritePlans.map(plan => (
                          <div
                            key={plan.id}
                            onClick={() => loadPlan(plan)}
                            className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Heart className="w-4 h-4 text-amber-500 fill-amber-500" />
                                  <span className="font-medium text-sm">
                                    {format(new Date(plan.created_at), 'd MMM yyyy', { locale: localeId })}
                                  </span>
                                </div>
                                {plan.preferences && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                                    {plan.preferences}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => deletePlan(plan.id, e)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="border-t my-3" />
                      </>
                    )}
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                      Semua Rencana
                    </p>
                    {savedPlans.filter(p => !p.is_favorite).map(plan => (
                      <div
                        key={plan.id}
                        onClick={() => loadPlan(plan)}
                        className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-medium text-sm">
                              {format(new Date(plan.created_at), 'd MMM yyyy', { locale: localeId })}
                            </span>
                            {plan.preferences && (
                              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                                {plan.preferences}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => deletePlan(plan.id, e)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Input Section */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="preferences" className="text-sm font-medium">
              Preferensi Makanan (opsional)
            </Label>
            <Input
              id="preferences"
              placeholder="Contoh: tidak suka sayur, alergi kacang..."
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generateMealPlan}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Membuat...
                </>
              ) : mealPlan ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Buat Ulang
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Buat Rencana AI
                </>
              )}
            </Button>
            {mealPlan && (
              <>
                <Button
                  onClick={toggleFavorite}
                  variant="outline"
                  size="icon"
                  className={isFavorite ? 'text-amber-500 border-amber-500' : ''}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
                </Button>
                <Button
                  onClick={saveMealPlan}
                  variant="outline"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1" />
                      Simpan
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Meal Plan Display */}
        <AnimatePresence mode="wait">
          {mealPlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Day Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                {mealPlan.weekPlan.map((day) => (
                  <Button
                    key={day.day}
                    variant={selectedDay === day.day ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDay(day.day)}
                    className={`flex-shrink-0 ${
                      selectedDay === day.day 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                        : ''
                    }`}
                  >
                    {day.day.substring(0, 3)}
                  </Button>
                ))}
              </div>

              {/* Selected Day Meals */}
              {currentDayPlan && (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl p-4 bg-gradient-to-br ${dayColors[selectedDay]} border`}
                >
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Badge variant="secondary">{selectedDay}</Badge>
                    Menu Hari Ini
                  </h3>

                  <div className="grid gap-3">
                    {/* Breakfast */}
                    <div className="bg-background/80 backdrop-blur rounded-lg p-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                          {mealIcons.breakfast}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Sarapan</span>
                          </div>
                          <h4 className="font-medium text-sm">{currentDayPlan.meals.breakfast.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{currentDayPlan.meals.breakfast.description}</p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {currentDayPlan.meals.breakfast.nutrients}
                          </Badge>
                        </div>
                        <div className="hidden sm:block">{getRandomFoodIcon(0)}</div>
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="bg-background/80 backdrop-blur rounded-lg p-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          {mealIcons.lunch}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Makan Siang</span>
                          </div>
                          <h4 className="font-medium text-sm">{currentDayPlan.meals.lunch.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{currentDayPlan.meals.lunch.description}</p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {currentDayPlan.meals.lunch.nutrients}
                          </Badge>
                        </div>
                        <div className="hidden sm:block">{getRandomFoodIcon(1)}</div>
                      </div>
                    </div>

                    {/* Dinner */}
                    <div className="bg-background/80 backdrop-blur rounded-lg p-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          {mealIcons.dinner}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Makan Malam</span>
                          </div>
                          <h4 className="font-medium text-sm">{currentDayPlan.meals.dinner.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{currentDayPlan.meals.dinner.description}</p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {currentDayPlan.meals.dinner.nutrients}
                          </Badge>
                        </div>
                        <div className="hidden sm:block">{getRandomFoodIcon(2)}</div>
                      </div>
                    </div>

                    {/* Snacks */}
                    {currentDayPlan.meals.snacks && currentDayPlan.meals.snacks.length > 0 && (
                      <div className="bg-background/80 backdrop-blur rounded-lg p-3 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            {mealIcons.snacks}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase">Camilan</span>
                            </div>
                            <div className="space-y-2">
                              {currentDayPlan.meals.snacks.map((snack, idx) => (
                                <div key={idx}>
                                  <h4 className="font-medium text-sm">{snack.name}</h4>
                                  <p className="text-xs text-muted-foreground">{snack.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="hidden sm:block">{getRandomFoodIcon(3)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Nutrition Tips */}
              {mealPlan.tips && mealPlan.tips.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Tips Nutrisi
                  </h4>
                  <ul className="space-y-1">
                    {mealPlan.tips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!mealPlan && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Utensils className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Klik tombol di atas untuk membuat rencana makan mingguan yang disesuaikan dengan usia {childName}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
