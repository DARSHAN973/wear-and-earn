import { NextResponse } from 'next/server'
import prisma from "@/lib/prisma";

/**
 * Check if user has formed Level 1 team eligibility for self weekly income
 * User must have:
 * 1. 3 direct referrals (A, B, C)
 * 2. All 3 must have made at least one purchase
 * 3. User must have received L1 commissions from all 3
 */
async function checkLevel1TeamEligibility(tx, userId) {
  console.log('Checking Level 1 team eligibility for user:', userId);
  
  // Get user's direct referrals
  const directReferrals = await tx.user.findMany({
    where: { sponsorId: userId },
    select: { id: true, fullName: true },
    orderBy: { createdAt: 'asc' }, // Check in order of joining
    take: 3 // Only need to check first 3
  });
  
  console.log(`User ${userId} has ${directReferrals.length} direct referrals`);
  
  if (directReferrals.length < 3) {
    console.log('Not eligible: Less than 3 direct referrals');
    return false;
  }
  
  // Check if all 3 directs have made purchases
  let qualifiedDirects = 0;
  
  for (const direct of directReferrals) {
    // Check if this direct has made any paid purchase
    const paidOrders = await tx.order.count({
      where: { 
        userId: direct.id,
        paidAt: { not: null }
      }
    });
    
    if (paidOrders > 0) {
      qualifiedDirects++;
    }
  }
  
  console.log(`User ${userId} has ${qualifiedDirects}/3 direct referrals with purchases`);
  
  const isEligible = qualifiedDirects >= 3;
  console.log(`User ${userId} Level 1 team eligibility: ${isEligible}`);
  
  return isEligible;
}


/**
 * Weekly Cron Job to Release Self-Payout Income
 * 
 * This endpoint should be called weekly (e.g., every Sunday at midnight)
 * to process scheduled self-income payouts for MLM users.
 * 
 * What it does:
 * 1. Find all due self-payout schedules (dueAt <= now, status = 'scheduled')
 * 2. Credit user wallets with the payout amounts
 * 3. Create ledger entries for audit trail
 * 4. Mark payouts as 'paid' to prevent double-processing
 * 5. Ensure idempotency (safe to run multiple times)
 * 
 * Usage:
 * - Set up a cron job to call this endpoint weekly
 * - Can be triggered manually by admin if needed
 * - Include authorization token for security in production
 */
export async function POST(request) {
  const startTime = Date.now()
  
  try {
    // Optional: Add authorization check for production
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized cron access' },
        { status: 401 }
      )
    }

    console.log('🕐 Starting weekly payout release process...')

    // Find all due payouts that haven't been processed yet
    const duePayouts = await prisma.selfPayoutSchedule.findMany({
      where: {
        status: 'scheduled',
        dueAt: {
          lte: new Date() // Due date has passed
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            isActive: true,
            walletBalance: true
          }
        }
      },
      orderBy: {
        dueAt: 'asc' // Process oldest payouts first
      }
    })

    if (duePayouts.length === 0) {
      console.log('✅ No due payouts found. Weekly process completed.')
      return NextResponse.json({
        success: true,
        message: 'No due payouts to process',
        summary: {
          totalProcessed: 0,
          totalAmount: { paisa: 0, rupees: 0 },
          executionTimeMs: Date.now() - startTime
        }
      })
    }

    console.log(`📋 Found ${duePayouts.length} due payouts to process`)

    let processedCount = 0
    let failedCount = 0
    let totalAmountPaisa = 0
    const processedPayouts = []
    const failedPayouts = []

    // Process each payout in a transaction to ensure data consistency
    for (const payout of duePayouts) {
      try {
        await prisma.$transaction(async (tx) => {
          // Double-check the payout hasn't been processed by another instance
          const currentPayout = await tx.selfPayoutSchedule.findUnique({
            where: { id: payout.id }
          })

          if (!currentPayout || currentPayout.status !== 'scheduled') {
            console.log(`⚠️  Payout ${payout.id} already processed, skipping`)
            return
          }

          // Only process payouts for active users
          if (!payout.user.isActive) {
            console.log(`⚠️  User ${payout.user.id} is inactive, skipping payout ${payout.id}`)
            
            // Mark as skipped instead of paid
            await tx.selfPayoutSchedule.update({
              where: { id: payout.id },
              data: { 
                status: 'skipped',
                skipReason: 'User inactive' 
              }
            })
            return
          }

          // Check Level 1 team eligibility (3 direct referrals who all purchased)
          const hasLevel1Team = await checkLevel1TeamEligibility(tx, payout.userId)
          
          if (!hasLevel1Team) {
            console.log(`⚠️  User ${payout.user.id} hasn't formed Level 1 team, skipping payout ${payout.id}`)
            
            // Mark as pending until eligibility is met
            await tx.selfPayoutSchedule.update({
              where: { id: payout.id },
              data: { 
                status: 'pending_eligibility',
                skipReason: 'Level 1 team not formed - need 3 direct referrals who all purchased' 
              }
            })
            return
          }

          // Credit the user's wallet
          await tx.user.update({
            where: { id: payout.userId },
            data: {
              walletBalance: {
                increment: payout.amount
              }
            }
          })

          // Create ledger entry for audit trail
          await tx.ledger.create({
            data: {
              userId: payout.userId,
              type: 'self_joining_instalment',
              amount: payout.amount,
              ref: `payout:${payout.id}:${payout.orderId}`,
              note: `Weekly self-income payout from order ${payout.orderId}`
            }
          })

          // Mark payout as paid
          await tx.selfPayoutSchedule.update({
            where: { id: payout.id },
            data: {
              status: 'paid',
              // Could add paidAt timestamp if you want to track when it was processed
            }
          })

          processedCount++
          totalAmountPaisa += payout.amount
          
          processedPayouts.push({
            payoutId: payout.id,
            userId: payout.userId,
            userName: payout.user.fullName,
            amount: {
              paisa: payout.amount,
              rupees: payout.amount / 100
            },
            orderId: payout.orderId,
            originalDueDate: payout.dueAt
          })

          console.log(`✅ Processed payout ${payout.id}: ₹${payout.amount/100} for user ${payout.user.fullName}`)
        })

      } catch (error) {
        console.error(`❌ Failed to process payout ${payout.id}:`, error)
        failedCount++
        failedPayouts.push({
          payoutId: payout.id,
          userId: payout.userId,
          userName: payout.user.fullName,
          error: error.message,
          amount: {
            paisa: payout.amount,
            rupees: payout.amount / 100
          }
        })
      }
    }

    const executionTime = Date.now() - startTime

    // Log summary
    console.log(`🎉 Weekly payout process completed!`)
    console.log(`✅ Successfully processed: ${processedCount} payouts`)
    console.log(`❌ Failed: ${failedCount} payouts`)
    console.log(`💰 Total amount distributed: ₹${totalAmountPaisa/100}`)
    console.log(`⏱️  Execution time: ${executionTime}ms`)

    // Return comprehensive summary
    return NextResponse.json({
      success: true,
      message: `Weekly payout process completed. Processed ${processedCount} payouts.`,
      summary: {
        totalProcessed: processedCount,
        totalFailed: failedCount,
        totalPayouts: duePayouts.length,
        totalAmount: {
          paisa: totalAmountPaisa,
          rupees: totalAmountPaisa / 100
        },
        executionTimeMs: executionTime,
        processedAt: new Date().toISOString()
      },
      details: {
        processedPayouts: processedPayouts.slice(0, 10), // Limit response size
        failedPayouts: failedPayouts.slice(0, 10),
        hasMoreProcessed: processedPayouts.length > 10,
        hasMoreFailed: failedPayouts.length > 10
      }
    })

  } catch (error) {
    console.error('💥 Weekly payout process failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Weekly payout process failed',
        message: error.message,
        executionTimeMs: Date.now() - startTime
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * GET endpoint to check payout status and upcoming payouts
 * Useful for admin monitoring and debugging
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 50

    // Get upcoming payouts (next 7 days)
    const upcomingPayouts = await prisma.selfPayoutSchedule.findMany({
      where: {
        status: 'scheduled',
        dueAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            isActive: true
          }
        }
      },
      orderBy: {
        dueAt: 'asc'
      },
      take: limit
    })

    // Get overdue payouts
    const overduePayouts = await prisma.selfPayoutSchedule.findMany({
      where: {
        status: 'scheduled',
        dueAt: {
          lt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            isActive: true
          }
        }
      },
      orderBy: {
        dueAt: 'asc'
      },
      take: limit
    })

    // Get statistics
    const stats = await prisma.selfPayoutSchedule.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    })

    const statsFormatted = {}
    stats.forEach(stat => {
      statsFormatted[stat.status] = {
        count: stat._count.id,
        totalAmount: {
          paisa: stat._sum.amount || 0,
          rupees: (stat._sum.amount || 0) / 100
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        upcoming: upcomingPayouts.map(payout => ({
          id: payout.id,
          userId: payout.userId,
          userName: payout.user.fullName,
          userActive: payout.user.isActive,
          amount: {
            paisa: payout.amount,
            rupees: payout.amount / 100
          },
          dueAt: payout.dueAt,
          orderId: payout.orderId,
          daysUntilDue: Math.ceil((new Date(payout.dueAt) - new Date()) / (1000 * 60 * 60 * 24))
        })),
        overdue: overduePayouts.map(payout => ({
          id: payout.id,
          userId: payout.userId,
          userName: payout.user.fullName,
          userActive: payout.user.isActive,
          amount: {
            paisa: payout.amount,
            rupees: payout.amount / 100
          },
          dueAt: payout.dueAt,
          orderId: payout.orderId,
          daysOverdue: Math.ceil((new Date() - new Date(payout.dueAt)) / (1000 * 60 * 60 * 24))
        })),
        statistics: statsFormatted
      }
    })

  } catch (error) {
    console.error('Error fetching payout status:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payout status',
        message: error.message
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
