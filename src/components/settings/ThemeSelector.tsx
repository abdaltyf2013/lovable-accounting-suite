import { motion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';
import { useTheme, colorThemes, ColorTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const themeColors: Record<ColorTheme, { bg: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  blue: { bg: 'bg-blue-500', ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-500', ring: 'ring-purple-500/30' },
  orange: { bg: 'bg-orange-500', ring: 'ring-orange-500/30' },
  rose: { bg: 'bg-rose-500', ring: 'ring-rose-500/30' },
};

export function ThemeSelector() {
  const { colorTheme, setColorTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Palette className="w-4 h-4 text-primary" />
        <span>لون الثيم</span>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
        {(Object.keys(colorThemes) as ColorTheme[]).map((theme) => (
          <motion.button
            key={theme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setColorTheme(theme)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
              colorTheme === theme
                ? `border-primary ${themeColors[theme].ring} ring-4`
                : 'border-border hover:border-primary/50'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full',
                themeColors[theme].bg,
                'shadow-lg'
              )}
            >
              {colorTheme === theme && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <Check className="w-5 h-5 text-white" />
                </motion.div>
              )}
            </div>
            <span className="text-xs font-medium">
              {colorThemes[theme].name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
