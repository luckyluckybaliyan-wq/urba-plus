import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function createGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const EARTH_RADIUS_METERS = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

function getLocationScore(distMeters: number): number {
  if (distMeters <= 10) return 100;
  if (distMeters <= 25) return 85;
  if (distMeters <= 50) return 70;
  if (distMeters <= 100) return 50;
  if (distMeters <= 200) return 30;
  return 0;
}

function getTimeScore(createdAtMs: number): number {
  if (!createdAtMs) return 50;
  const now = Date.now();
  const diffHours = Math.abs(now - createdAtMs) / (1000 * 60 * 60);
  if (diffHours <= 2) return 100;
  if (diffHours <= 24) return 90;
  if (diffHours <= 72) return 75;
  if (diffHours <= 168) return 60;
  return 30;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { newIssue, candidateIssues } = body;

    if (!newIssue || !Array.isArray(candidateIssues) || candidateIssues.length === 0) {
      return NextResponse.json({
        success: true,
        duplicateFound: false,
        matches: [],
      });
    }

    const { latitude, longitude, description, category, issueType, imageBase64 } = newIssue;

    // Spatial pre-filtering: candidates within 250 meters or matching category
    const spatialCandidates = candidateIssues
      .map((item: any) => {
        const itemLat = item.location?.latitude || item.latitude;
        const itemLon = item.location?.longitude || item.longitude;
        const dist = calculateDistanceMeters(latitude, longitude, itemLat, itemLon);
        const locScore = getLocationScore(dist);

        let createdMs = Date.now();
        if (item.createdAt?.seconds) {
          createdMs = item.createdAt.seconds * 1000;
        } else if (typeof item.createdAt === 'string') {
          createdMs = new Date(item.createdAt).getTime();
        }
        const timeScore = getTimeScore(createdMs);

        return {
          ...item,
          distanceMeters: dist,
          locationScore: locScore,
          timeScore,
        };
      })
      .filter((item: any) => item.distanceMeters <= 250 || item.category === category)
      .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters)
      .slice(0, 3);

    if (spatialCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        duplicateFound: false,
        matches: [],
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let aiMatches: any[] = [];

    if (apiKey) {
      const ai = createGenAIClient();
      const cleanNewImage = imageBase64 ? imageBase64.replace(/^data:image\/\w+;base64,/, '') : null;

      for (const candidate of spatialCandidates) {
        try {
          const parts: any[] = [];

          if (cleanNewImage) {
            parts.push({
              inlineData: {
                data: cleanNewImage,
                mimeType: 'image/jpeg',
              },
            });
          }

          const candidateImageUrl = candidate.imageUrl;
          if (candidateImageUrl && candidateImageUrl.startsWith('data:image')) {
            const cleanCandImage = candidateImageUrl.replace(/^data:image\/\w+;base64,/, '');
            parts.push({
              inlineData: {
                data: cleanCandImage,
                mimeType: 'image/jpeg',
              },
            });
          }

          const promptText = `You are an AI Civic Duplicate Complaint Inspector.
Compare the NEW REPORT against an EXISTING REPORT in the database.

[NEW REPORT]
- Issue Category: ${category || 'Unknown'}
- Issue Type: ${issueType || 'Unknown'}
- Description: ${description || 'No description'}
- Distance from existing issue: ${candidate.distanceMeters} meters away

[EXISTING REPORT #${candidate.ticketId || candidate.id}]
- Title/Type: ${candidate.title || candidate.issueType || 'Unknown'}
- Description: ${candidate.description || 'No description'}
- Category: ${candidate.category || 'Unknown'}

INSTRUCTIONS:
Evaluate if these two reports refer to the EXACT SAME physical infrastructure problem or municipal defect (e.g. same pothole, same garbage pile, same broken light).
Assess:
1. imageScore (0 to 100): Visual similarity of defect shown in photos. (If photos unavailable, score based on context/defaults around 50).
2. textScore (0 to 100): Semantic similarity between descriptions.
3. reason: 1-2 sentence concise justification.`;

          parts.push({ text: promptText });

          const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
          let res: any = null;

          for (const modelName of modelsToTry) {
            try {
              res = await ai.models.generateContent({
                model: modelName,
                contents: { parts },
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      imageScore: { type: Type.NUMBER },
                      textScore: { type: Type.NUMBER },
                      reason: { type: Type.STRING },
                    },
                    required: ['imageScore', 'textScore', 'reason'],
                  },
                },
              });
              if (res) break;
            } catch {
              // Try next candidate model
            }
          }

          let imageScore = 50;
          let textScore = 50;
          let reason = 'Locations match in close proximity.';

          if (res && res.text) {
            const parsed = JSON.parse(res.text);
            imageScore = Math.min(100, Math.max(0, Number(parsed.imageScore) || 50));
            textScore = Math.min(100, Math.max(0, Number(parsed.textScore) || 50));
            reason = parsed.reason || reason;
          }

          const locScore = candidate.locationScore;
          const timeScore = candidate.timeScore;
          const overallScore = Math.round(
            locScore * 0.4 + imageScore * 0.35 + textScore * 0.2 + timeScore * 0.05
          );

          aiMatches.push({
            candidateId: candidate.id,
            ticketId: candidate.ticketId || candidate.id,
            title: candidate.title || candidate.issueType || 'Civic Issue',
            category: candidate.category,
            description: candidate.description,
            imageUrl: candidate.imageUrl,
            distanceMeters: candidate.distanceMeters,
            locationScore: locScore,
            imageScore,
            textScore,
            timeScore,
            overallScore,
            reason,
            supportersCount: candidate.supportersCount || candidate.upvotes || 1,
            status: candidate.status,
            createdAt: candidate.createdAt,
          });
        } catch (candErr) {
          console.warn('Error evaluating candidate:', candErr);
        }
      }
    } else {
      aiMatches = spatialCandidates.map((candidate: any) => {
        const locScore = candidate.locationScore;
        const matchesKeyword =
          candidate.description &&
          description &&
          candidate.description.toLowerCase().includes(description.toLowerCase().slice(0, 10));
        const textScore = matchesKeyword ? 80 : 50;
        const overallScore = Math.round(locScore * 0.6 + textScore * 0.3 + candidate.timeScore * 0.1);
        return {
          candidateId: candidate.id,
          ticketId: candidate.ticketId || candidate.id,
          title: candidate.title || candidate.issueType || 'Civic Issue',
          category: candidate.category,
          description: candidate.description,
          imageUrl: candidate.imageUrl,
          distanceMeters: candidate.distanceMeters,
          locationScore: locScore,
          imageScore: 60,
          textScore,
          timeScore: candidate.timeScore,
          overallScore,
          reason: `High spatial proximity (${candidate.distanceMeters}m away).`,
          supportersCount: candidate.supportersCount || candidate.upvotes || 1,
          status: candidate.status,
          createdAt: candidate.createdAt,
        };
      });
    }

    aiMatches.sort((a, b) => b.overallScore - a.overallScore);

    const topMatch = aiMatches[0];
    const isDuplicate = topMatch && topMatch.overallScore >= 75;

    return NextResponse.json({
      success: true,
      duplicateFound: isDuplicate,
      topMatch: isDuplicate ? topMatch : null,
      allMatches: aiMatches,
    });
  } catch (error: any) {
    console.error('Error in check-duplicates route:', error);
    return NextResponse.json({
      success: true,
      duplicateFound: false,
      matches: [],
    });
  }
}
