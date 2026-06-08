package com.example.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.SavedMeal
import java.text.SimpleDateFormat
import java.util.*

enum class ChartMetric {
    CALORIES, PROTEIN, FAT, FIBER
}

data class DayIntake(
    val dayLabel: String,
    val dateLabel: String,
    val calories: Int,
    val protein: Int,
    val fat: Int,
    val fiber: Int,
    val isToday: Boolean
)

@Composable
fun WeeklyMacroChart(
    savedMeals: List<SavedMeal>,
    targetCalories: Int,
    targetProtein: Int,
    targetFat: Int,
    targetFiber: Int,
    modifier: Modifier = Modifier
) {
    var selectedMetric by remember { mutableStateOf(ChartMetric.CALORIES) }
    var selectedDayIndex by remember { mutableStateOf<Int?>(null) }

    val weeklyData = remember(savedMeals) {
        prepareWeeklyData(savedMeals)
    }

    val maxVal = remember(weeklyData, selectedMetric) {
        val calculatedMax = weeklyData.maxOfOrNull { day ->
            when (selectedMetric) {
                ChartMetric.CALORIES -> day.calories
                ChartMetric.PROTEIN -> day.protein
                ChartMetric.FAT -> day.fat
                ChartMetric.FIBER -> day.fiber
            }
        } ?: 0
        val target = when (selectedMetric) {
            ChartMetric.CALORIES -> targetCalories
            ChartMetric.PROTEIN -> targetProtein
            ChartMetric.FAT -> targetFat
            ChartMetric.FIBER -> targetFiber
        }
        maxOf(calculatedMax, target, 1)
    }

    val targetValue = when (selectedMetric) {
        ChartMetric.CALORIES -> targetCalories
        ChartMetric.PROTEIN -> targetProtein
        ChartMetric.FAT -> targetFat
        ChartMetric.FIBER -> targetFiber
    }

    val unit = when (selectedMetric) {
        ChartMetric.CALORIES -> "kcal"
        ChartMetric.PROTEIN -> "g"
        ChartMetric.FAT -> "g"
        ChartMetric.FIBER -> "g"
    }

    val themeColor = when (selectedMetric) {
        ChartMetric.CALORIES -> MaterialTheme.colorScheme.primary
        ChartMetric.PROTEIN -> Color(0xFF10B981)
        ChartMetric.FAT -> Color(0xFFF59E0B)
        ChartMetric.FIBER -> Color(0xFF3B82F6)
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            Column {
                Text(
                    text = "WEEKLY HISTORICAL TREND",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    letterSpacing = 0.5.sp
                )
                Text(
                    text = "Weekly Macro Report",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // Metric Chip Toggle Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                ChartMetric.values().forEach { metric ->
                    val isSelected = metric == selectedMetric
                    val label = when (metric) {
                        ChartMetric.CALORIES -> "Cals"
                        ChartMetric.PROTEIN -> "Protein"
                        ChartMetric.FAT -> "Fats"
                        ChartMetric.FIBER -> "Fiber"
                    }
                    val color = when (metric) {
                        ChartMetric.CALORIES -> MaterialTheme.colorScheme.primary
                        ChartMetric.PROTEIN -> Color(0xFF10B981)
                        ChartMetric.FAT -> Color(0xFFF59E0B)
                        ChartMetric.FIBER -> Color(0xFF3B82F6)
                    }

                    ChartMenuChip(
                        label = label,
                        isSelected = isSelected,
                        color = color,
                        onClick = {
                            selectedMetric = metric
                            selectedDayIndex = null
                        }
                    )
                }
            }

            // Stats Callout Panel
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                if (selectedDayIndex != null) {
                    val day = weeklyData.getOrNull(selectedDayIndex!!)
                    if (day != null) {
                        val intake = when (selectedMetric) {
                            ChartMetric.CALORIES -> day.calories
                            ChartMetric.PROTEIN -> day.protein
                            ChartMetric.FAT -> day.fat
                            ChartMetric.FIBER -> day.fiber
                        }
                        val percent = (intake.toFloat() / targetValue.toFloat() * 100).toInt()
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(themeColor.copy(alpha = 0.08f))
                                .border(BorderStroke(1.dp, themeColor.copy(alpha = 0.15f)), RoundedCornerShape(12.dp))
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${day.dateLabel}:",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "$intake / $targetValue $unit ($percent%)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = themeColor
                            )
                        }
                    }
                } else {
                    val avgVal = weeklyData.map { day ->
                        when (selectedMetric) {
                            ChartMetric.CALORIES -> day.calories
                            ChartMetric.PROTEIN -> day.protein
                            ChartMetric.FAT -> day.fat
                            ChartMetric.FIBER -> day.fiber
                        }
                    }.average().toInt()
                    Text(
                        text = "Average weekly intake is $avgVal $unit. Tap any day's bar to analyze the historical records.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                        lineHeight = 15.sp
                    )
                }
            }

            // Visual Columns Chart Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Bottom
            ) {
                weeklyData.forEachIndexed { index, day ->
                    val intakeValue = when (selectedMetric) {
                        ChartMetric.CALORIES -> day.calories
                        ChartMetric.PROTEIN -> day.protein
                        ChartMetric.FAT -> day.fat
                        ChartMetric.FIBER -> day.fiber
                    }

                    val fillRatio = (intakeValue.toFloat() / maxVal.toFloat()).coerceIn(0f, 1f)
                    val animatedRatio by animateFloatAsState(targetValue = fillRatio, label = "BarHeight")
                    val isSelected = index == selectedDayIndex

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clickable { selectedDayIndex = if (isSelected) null else index },
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Bottom
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .width(16.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    if (isSelected) themeColor.copy(alpha = 0.15f)
                                    else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.04f)
                                ),
                            contentAlignment = Alignment.BottomCenter
                        ) {
                            // Guideline target line inside bar if relevant
                            val targetRatio = (targetValue.toFloat() / maxVal.toFloat()).coerceIn(0f, 1f)
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .fillMaxHeight(targetRatio),
                                contentAlignment = Alignment.TopCenter
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(1.dp)
                                        .background(Color.White.copy(alpha = 0.4f))
                                )
                            }

                            // Interactive fills
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .fillMaxHeight(animatedRatio)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (day.isToday) themeColor
                                        else themeColor.copy(alpha = 0.7f)
                                    )
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = day.dayLabel,
                            fontSize = 11.sp,
                            fontWeight = if (day.isToday) FontWeight.Black else FontWeight.Bold,
                            color = if (day.isToday) themeColor else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ChartMenuChip(
    label: String,
    isSelected: Boolean,
    color: Color,
    onClick: () -> Unit
) {
    Surface(
        color = if (isSelected) color.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
        shape = CircleShape,
        border = BorderStroke(
            width = if (isSelected) 1.5.dp else 1.dp,
            color = if (isSelected) color else MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
        ),
        modifier = Modifier.clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(color, CircleShape)
            )
            Text(
                text = label,
                fontSize = 11.sp,
                color = if (isSelected) color else MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

private fun prepareWeeklyData(savedMeals: List<SavedMeal>): List<DayIntake> {
    val result = ArrayList<DayIntake>()
    val daySdf = SimpleDateFormat("EEE", Locale.getDefault())
    val dateSdf = SimpleDateFormat("EEEE, MMM d", Locale.getDefault())

    val todayMidnight = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }

    for (i in 6 downTo 0) {
        val calendar = Calendar.getInstance().apply {
            time = todayMidnight.time
            add(Calendar.DAY_OF_YEAR, -i)
        }

        val dayStart = calendar.timeInMillis
        val dayEnd = Calendar.getInstance().apply {
            time = calendar.time
            add(Calendar.DAY_OF_YEAR, 1)
        }.timeInMillis

        val dayMeals = savedMeals.filter { it.timestamp in dayStart until dayEnd }
        val cals = dayMeals.sumOf { it.analysis.totalCalories }
        val pro = dayMeals.sumOf { it.analysis.totalProtein }
        val fat = dayMeals.sumOf { it.analysis.totalFat }
        val fib = dayMeals.sumOf { it.analysis.totalFiber }

        var label = daySdf.format(calendar.time).uppercase()
        val dateLabel = dateSdf.format(calendar.time)

        if (i == 0) {
            label = "TDY"
        }

        result.add(
            DayIntake(
                dayLabel = label,
                dateLabel = dateLabel,
                calories = cals,
                protein = pro,
                fat = fat,
                fiber = fib,
                isToday = (i == 0)
            )
        )
    }
    return result
}
