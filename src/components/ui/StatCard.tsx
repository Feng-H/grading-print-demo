import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  color?: 'primary' | 'accent' | 'info' | 'warning' | 'success';
  suffix?: string;
}

const colorMap = {
  primary: 'bg-primary-100 text-primary-600',
  accent: 'bg-accent-100 text-accent-600',
  info: 'bg-blue-100 text-blue-600',
  warning: 'bg-amber-100 text-amber-600',
  success: 'bg-green-100 text-green-600',
};

const bgColorMap = {
  primary: 'from-primary-50 to-white',
  accent: 'from-accent-50 to-white',
  info: 'from-blue-50 to-white',
  warning: 'from-amber-50 to-white',
  success: 'from-green-50 to-white',
};

export default function StatCard({ title, value, icon: Icon, trend, color = 'primary', suffix }: StatCardProps) {
  return (
    <div className={`card-hover rounded-2xl bg-gradient-to-br ${bgColorMap[color]} p-5 border border-border/50`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold">
            {value}
            {suffix && <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
          {trend !== undefined && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              {Math.abs(trend)}% 较上周
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colorMap[color]} flex items-center justify-center`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
