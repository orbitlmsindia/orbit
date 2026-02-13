import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { CourseCard } from "@/components/ui/course-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Play,
  Calendar,
  ChevronRight,
} from "lucide-react";

const recentCourses: any[] = [];
const upcomingDeadlines: any[] = [];
const achievements: any[] = [];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Welcome back, John! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Continue where you left off and keep learning.
            </p>
          </div>
          <Button className="gap-2">
            <Play className="h-4 w-4" />
            Resume Learning
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Courses Enrolled"
            value={0}
            icon={<BookOpen className="h-5 w-5" />}
          />
          <StatCard
            title="Hours Learned"
            value="0"
            icon={<Clock className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Certificates Earned"
            value={0}
            icon={<Award className="h-5 w-5" />}
            variant="accent"
          />
          <StatCard
            title="Current Streak"
            value="0 days"
            icon={<TrendingUp className="h-5 w-5" />}
            description="Start learning!"
            variant="success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Courses */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold font-display">My Courses</h2>
              <Button variant="ghost" className="gap-1 text-sm">
                View all <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentCourses.map((course) => (
                <CourseCard key={course.id} {...course} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Weekly Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">Weekly Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Learning Goal</span>
                    <span className="font-medium">5h / 8h</span>
                  </div>
                  <Progress value={62.5} variant="accent" showLabel />
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                    <div key={i} className="text-center">
                      <div
                        className={`h-8 w-8 rounded-lg mx-auto flex items-center justify-center text-xs font-medium ${i < 5
                          ? "bg-success text-success-foreground"
                          : i === 5
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/50 text-muted-foreground"
                          }`}
                      >
                        {i < 5 ? "✓" : ""}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">{day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingDeadlines.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="mt-0.5">
                      {item.type === "quiz" && <span>📝</span>}
                      {item.type === "assignment" && <span>📋</span>}
                      {item.type === "review" && <span>📖</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.course}</p>
                    </div>
                    <Badge variant={i === 0 ? "warning" : "secondary"} className="text-xs shrink-0">
                      {item.dueDate}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/20 transition-colors"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
