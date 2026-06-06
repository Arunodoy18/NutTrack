package com.example.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.DailyTotals
import com.example.model.NutrientTargets
import com.example.model.SavedMeal
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun InsightsTabContent(
    viewModel: CalBuddyViewModel,
    nutrientTargets: NutrientTargets,
    dailyTotals: DailyTotals,
    savedMeals: List<SavedMeal>,
    modifier: Modifier = Modifier
) {
    var activeSubSection by remember { mutableStateOf("insights") } // "insights" | "goals" | "gamification"

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 40.dp)
    ) {
        // Toggle Subsections Button Row
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(5.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    listOf(
                        "insights" to "Insights",
                        "goals" to "Focus Goals",
                        "gamification" to "Awards"
                    ).forEach { (sub, label) ->
                        val isSelected = activeSubSection == sub
                        val buttonBg by animateColorAsState(
                            targetValue = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                            animationSpec = tween(250)
                        )
                        val buttonTextCol by animateColorAsState(
                            targetValue = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                            animationSpec = tween(250)
                        )

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(38.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(buttonBg)
                                .clickable { activeSubSection = sub },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = buttonTextCol
                            )
                        }
                    }
                }
            }
        }

        when (activeSubSection) {
            "insights" -> {
                item {
                    AppleHealthCoachInsights(savedMeals, dailyTotals, nutrientTargets)
                }
                item {
                    HistoricalMetricsAveragesCard(savedMeals)
                }
            }
            "goals" -> {
                item {
                    VisualGoalSlidersCard(
                        nutrientTargets = nutrientTargets,
                        onUpdateTargets = { newTargets ->
                            viewModel.updateNutrientTargets(newTargets)
                        }
                    )
                }
            }
            "gamification" -> {
                item {
                    StreaksAchievementCard(savedMeals)
                }
                item {
                    AwardsTrophyCaseCard(savedMeals, dailyTotals, nutrientTargets)
                }
            }
        }
    }
}

@Composable
fun AppleHealthCoachInsights(
    savedMeals: List<SavedMeal>,
    dailyTotals: DailyTotals,
    targets: NutrientTargets
) {
    val totalCaloriesToday = dailyTotals.calories
    val targetVal = targets.calories
    val percent = (totalCaloriesToday.toFloat() / targetVal.toFloat() * 100).toInt()

    val adviceHeader: String
    val adviceText: String
    val coachThemeIcon: ImageVector
    val coachThemeColor: Color

    if (totalCaloriesToday == 0) {
        adviceHeader = "Ready to start your nutrition journey?"
        adviceText = "Capture or search for your first meal. Tracking is the first and most critical component of achieving sustainable long-term health."
        coachThemeIcon = Icons.Default.Face
        coachThemeColor = MaterialTheme.colorScheme.primary
    } else if (totalCaloriesToday > targetVal) {
        adviceHeader = "Active High-Energy Day"
        adviceText = "Today is a higher-energy day ($percent% of your baseline budget). Try balancing your next meal with high-fiber ingredients like leaf greens & healthy fibers."
        coachThemeIcon = Icons.Default.Info
        coachThemeColor = Color(0xFFF59E0B)
    } else if (percent >= 85) {
        adviceHeader = "Absolute Nutrition Lock-In"
        adviceText = "Excellent precision! You reached $percent% of your optimal calorie targets. Your current diet aligns beautifully with premium USDA cellular longevity guidelines."
        coachThemeIcon = Icons.Default.Star
        coachThemeColor = Color(0xFF10B981)
    } else {
        adviceHeader = "Steady Energy Integration"
        adviceText = "You're at $percent% of your daily metabolism allowance ($totalCaloriesToday / $targetVal kcal). Excellent pace. Prioritize high-protein choices if you are active."
        coachThemeIcon = Icons.Default.Favorite
        coachThemeColor = Color(0xFF06B6D4)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    color = coachThemeColor.copy(alpha = 0.12f),
                    shape = CircleShape,
                    modifier = Modifier.size(40.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = coachThemeIcon,
                            contentDescription = "Coach Icon",
                            tint = coachThemeColor,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Column {
                    Text(
                        text = "COACH NUTRITIONAL ADVICE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        letterSpacing = 0.8.sp
                    )
                    Text(
                        text = adviceHeader,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            Text(
                text = adviceText,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 18.sp
            )

            // Dynamic Progress Rings Visual Mock
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(
                            listOf(
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.12f),
                                Color(0xFF22D3EE).copy(alpha = 0.05f)
                            )
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
                    .padding(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = "METRIC ANALYSIS",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.primary,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "Protein-to-Calorie Ratio",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Text(
                        text = "Optimal Ratio",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF10B981)
                    )
                }
            }
        }
    }
}

@Composable
fun HistoricalMetricsAveragesCard(savedMeals: List<SavedMeal>) {
    val totalMeals = savedMeals.size
    val avgCals = if (totalMeals > 0) savedMeals.map { it.analysis.totalCalories }.average().toInt() else 0
    val avgProtein = if (totalMeals > 0) savedMeals.map { it.analysis.totalProtein }.average().toInt() else 0
    val avgFat = if (totalMeals > 0) savedMeals.map { it.analysis.totalFat }.average().toInt() else 0
    val avgFiber = if (totalMeals > 0) savedMeals.map { it.analysis.totalFiber }.average().toInt() else 0

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Column {
                Text(
                    text = "HISTORICAL METRIC AGGREGATION",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    letterSpacing = 0.8.sp
                )
                Text(
                    text = "Historical Average Performance",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            if (totalMeals == 0) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Collect history to formulate a robust nutritional average statement.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    listOf(
                        Triple("Calories", "$avgCals", MaterialTheme.colorScheme.primary),
                        Triple("Protein", "${avgProtein}g", Color(0xFF10B981)),
                        Triple("Fats", "${avgFat}g", Color(0xFFF59E0B)),
                        Triple("Fiber", "${avgFiber}g", Color(0xFF3B82F6))
                    ).forEach { (label, value, color) ->
                        Card(
                            modifier = Modifier
                                .weight(1f)
                                .height(82.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = value,
                                    fontSize = 15.sp,
                                    color = color,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                }

                Text(
                    text = "Averages formulated across a total count of $totalMeals registered meal log events.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
fun VisualGoalSlidersCard(
    nutrientTargets: NutrientTargets,
    onUpdateTargets: (NutrientTargets) -> Unit
) {
    var calories by remember(nutrientTargets) { mutableStateOf(nutrientTargets.calories.toFloat()) }
    var protein by remember(nutrientTargets) { mutableStateOf(nutrientTargets.protein.toFloat()) }
    var fat by remember(nutrientTargets) { mutableStateOf(nutrientTargets.fat.toFloat()) }
    var fiber by remember(nutrientTargets) { mutableStateOf(nutrientTargets.fiber.toFloat()) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            Column {
                Text(
                    text = "CUSTOM GOAL SETTINGS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    letterSpacing = 0.8.sp
                )
                Text(
                    text = "Tune Nutrition Benchmarks",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // Calorie slider
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Daily Calories Budget", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Text("${calories.toInt()} kcal", fontSize = 13.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = calories,
                    onValueChange = {
                        calories = it
                        onUpdateTargets(NutrientTargets(calories.toInt(), protein.toInt(), fat.toInt(), fiber.toInt()))
                    },
                    valueRange = 1200f..4000f,
                    colors = SliderDefaults.colors(
                        thumbColor = MaterialTheme.colorScheme.primary,
                        activeTrackColor = MaterialTheme.colorScheme.primary,
                        inactiveTrackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                    )
                )
            }

            // Protein slider
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Protein Targets", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Text("${protein.toInt()}g", fontSize = 13.sp, fontWeight = FontWeight.Black, color = Color(0xFF10B981))
                }
                Slider(
                    value = protein,
                    onValueChange = {
                        protein = it
                        onUpdateTargets(NutrientTargets(calories.toInt(), protein.toInt(), fat.toInt(), fiber.toInt()))
                    },
                    valueRange = 40f..250f,
                    colors = SliderDefaults.colors(
                        thumbColor = Color(0xFF10B981),
                        activeTrackColor = Color(0xFF10B981),
                        inactiveTrackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                    )
                )
            }

            // Fat slider
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Fats Targets", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Text("${fat.toInt()}g", fontSize = 13.sp, fontWeight = FontWeight.Black, color = Color(0xFFF59E0B))
                }
                Slider(
                    value = fat,
                    onValueChange = {
                        fat = it
                        onUpdateTargets(NutrientTargets(calories.toInt(), protein.toInt(), fat.toInt(), fiber.toInt()))
                    },
                    valueRange = 25f..150f,
                    colors = SliderDefaults.colors(
                        thumbColor = Color(0xFFF59E0B),
                        activeTrackColor = Color(0xFFF59E0B),
                        inactiveTrackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                    )
                )
            }

            // Fiber slider
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Fibers Daily Goal", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Text("${fiber.toInt()}g", fontSize = 13.sp, fontWeight = FontWeight.Black, color = Color(0xFF3B82F6))
                }
                Slider(
                    value = fiber,
                    onValueChange = {
                        fiber = it
                        onUpdateTargets(NutrientTargets(calories.toInt(), protein.toInt(), fat.toInt(), fiber.toInt()))
                    },
                    valueRange = 10f..80f,
                    colors = SliderDefaults.colors(
                        thumbColor = Color(0xFF3B82F6),
                        activeTrackColor = Color(0xFF3B82F6),
                        inactiveTrackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                    )
                )
            }
        }
    }
}

@Composable
fun StreaksAchievementCard(savedMeals: List<SavedMeal>) {
    // Math streak logic based on history timestamps
    val streakCount = remember(savedMeals) {
        val uniqueDays = savedMeals.map {
            val cal = Calendar.getInstance().apply { timeInMillis = it.timestamp }
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            cal.timeInMillis
        }.distinct().sortedDescending()

        var currentStreak = 0
        if (uniqueDays.isNotEmpty()) {
            val todayMid = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis

            val firstDay = uniqueDays[0]
            val diffMs = todayMid - firstDay
            val diffDays = diffMs / (1000 * 60 * 60 * 24)

            // If last meal is today or yesterday, count streak
            if (diffDays <= 1) {
                currentStreak = 1
                var previousDay = firstDay
                for (i in 1 until uniqueDays.size) {
                    val currentDay = uniqueDays[i]
                    val stepDiff = previousDay - currentDay
                    val stepDays = stepDiff / (1000 * 60 * 60 * 24)
                    if (stepDays == 1L) {
                        currentStreak++
                        previousDay = currentDay
                    } else if (stepDays > 1L) {
                        break
                    }
                }
            }
        }
        currentStreak
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "HEALTHY DOPAMINE STREAKS",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        letterSpacing = 0.8.sp
                    )
                    Text(
                        text = "Activity Streak Consistency",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                Surface(
                    color = Color(0xFFFEF3C7),
                    shape = CircleShape
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = "Streak Fire",
                            tint = Color(0xFFF59E0B),
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = if (streakCount > 0) "$streakCount Days" else "0 Days",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFB45309)
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                // Render 7 calendar day check circle markers
                val daySdf = SimpleDateFormat("EE", Locale.getDefault())
                val today = Calendar.getInstance()
                val calendarDayLabels = ArrayList<Pair<String, Boolean>>()

                for (i in 6 downTo 0) {
                    val cal = Calendar.getInstance().apply {
                        add(Calendar.DAY_OF_YEAR, -i)
                    }
                    val label = daySdf.format(cal.time).first().toString().uppercase()
                    // Check if there is any meal logged for this day
                    val dayStart = cal.apply {
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }.timeInMillis
                    val dayEnd = dayStart + 24 * 60 * 60 * 1000L
                    val hit = savedMeals.any { it.timestamp in dayStart until dayEnd }
                    calendarDayLabels.add(label to hit)
                }

                calendarDayLabels.forEach { (label, completed) ->
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(
                                    if (completed) Color(0xFF10B981)
                                    else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.04f)
                                )
                                .border(
                                    BorderStroke(
                                        1.dp,
                                        if (completed) Color(0xFF10B981)
                                        else MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                                    ),
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (completed) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Done",
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                            } else {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                                )
                            }
                        }
                    }
                }
            }

            Text(
                text = if (streakCount > 0) {
                    "Superb consistency! You logged consecutive days. Keep logging each meal to retain streak fire!"
                } else {
                    "Begin logs tomorrow to ignite a new consecutive streak counter."
                },
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                lineHeight = 15.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun AwardsTrophyCaseCard(
    savedMeals: List<SavedMeal>,
    dailyTotals: DailyTotals,
    targets: NutrientTargets
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Column {
                Text(
                    text = "NUTRITION STAR AWARDS VILLA",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    letterSpacing = 0.8.sp
                )
                Text(
                    text = "Unlocked Milestone Badges",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            val badge1 = savedMeals.isNotEmpty()
            val badge2 = dailyTotals.protein >= targets.protein && targets.protein > 0
            val badge3 = savedMeals.size >= 7
            val badge4 = dailyTotals.fiber >= targets.fiber && targets.fiber > 0

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                TrophyCell(
                    modifier = Modifier.weight(1f),
                    title = "First Logged",
                    isUnlocked = badge1,
                    unlockedIcon = Icons.Default.Favorite,
                    color = MaterialTheme.colorScheme.primary
                )
                TrophyCell(
                    modifier = Modifier.weight(1f),
                    title = "Protein King",
                    isUnlocked = badge2,
                    unlockedIcon = Icons.Default.Star,
                    color = Color(0xFF10B981)
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                TrophyCell(
                    modifier = Modifier.weight(1f),
                    title = "7-Day Consistent",
                    isUnlocked = badge3,
                    unlockedIcon = Icons.Default.ThumbUp,
                    color = Color(0xFFF59E0B)
                )
                TrophyCell(
                    modifier = Modifier.weight(1f),
                    title = "Fiber Knight",
                    isUnlocked = badge4,
                    unlockedIcon = Icons.Default.Favorite,
                    color = Color(0xFF3B82F6)
                )
            }
        }
    }
}

@Composable
fun TrophyCell(
    modifier: Modifier = Modifier,
    title: String,
    isUnlocked: Boolean,
    unlockedIcon: ImageVector,
    color: Color
) {
    Surface(
        modifier = modifier.height(100.dp),
        shape = RoundedCornerShape(18.dp),
        color = if (isUnlocked) color.copy(alpha = 0.05f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f),
        border = BorderStroke(
            width = if (isUnlocked) 1.5.dp else 1.dp,
            color = if (isUnlocked) color.copy(alpha = 0.4f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                color = if (isUnlocked) color else Color.LightGray.copy(alpha = 0.25f),
                shape = CircleShape,
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = if (isUnlocked) unlockedIcon else Icons.Default.Lock,
                        contentDescription = title,
                        tint = if (isUnlocked) Color.White else Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = if (isUnlocked) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                textAlign = TextAlign.Center
            )
        }
    }
}
