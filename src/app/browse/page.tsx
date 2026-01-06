'use client'

import { useState } from 'react'
import { gql, useQuery } from '@apollo/client'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, FileText, MessageSquare, Eye, ArrowUp } from 'lucide-react'
import { getFileExtension } from '@/lib/utils'

const BROWSE_QUERY = gql`
  query Browse($page: Int, $limit: Int, $sort: String, $filter: String, $search: String) {
    browse(page: $page, limit: $limit, sort: $sort, filter: $filter, search: $search) {
      items {
        ... on File {
          id
          name
          timestamp
          thumbnailUrl
          mimeType
          views
          commentCount
          karma
          user {
            username
          }
          anonId
        }
        ... on Album {
          id
          name
          timestamp
          views
          commentCount
          karma
          user {
            username
          }
          anonId
          files {
            thumbnailUrl
            mimeType
          }
        }
        ... on Timeline {
          id
          name
          timestamp
          views
          commentCount
          karma
          user {
            username
          }
          anonId
        }
      }
      total
      hasMore
    }
  }
`

export default function BrowsePage() {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('recent')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, loading, refetch } = useQuery(BROWSE_QUERY, {
    variables: {
      page,
      limit: 49,
      sort,
      filter,
      search,
    },
  })

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setPage(1)
  }

  const handleSortChange = (value: string) => {
    setSort(value)
    setPage(1)
  }

  const items = data?.browse?.items || []
  const hasMore = data?.browse?.hasMore || false

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Browse</h1>

        <Card className="p-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Search files, albums, and timelines..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Sort By</Label>
              <Tabs value={sort} onValueChange={handleSortChange}>
                <TabsList>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="recent-comment">Recent Comment</TabsTrigger>
                  <TabsTrigger value="popular">Popular</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Filter</Label>
              <Tabs value={filter} onValueChange={handleFilterChange}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="albums">Albums</TabsTrigger>
                  <TabsTrigger value="timelines">Timelines</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item: any) => (
                <BrowseItem key={`${item.__typename}-${item.id}`} item={item} />
              ))}
            </div>

            {items.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">No items found</p>
              </div>
            )}

            {items.length > 0 && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground">
                  Page {page}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BrowseItem({ item }: { item: any }) {
  const isFile = item.__typename === 'File'
  const isAlbum = item.__typename === 'Album'
  const isTimeline = item.__typename === 'Timeline'

  const href = isFile
    ? `/file/${item.id}`
    : isAlbum
    ? `/album/${item.id}`
    : `/timeline/${item.id}`

  const thumbnail = isFile
    ? item.thumbnailUrl || null
    : isAlbum
    ? item.files[0]?.thumbnailUrl || null
    : null

  const showEmbed = thumbnail || (isFile && item.mimeType.startsWith('image/'))

  return (
    <Link href={href}>
      <Card className="overflow-hidden hover:border-primary transition-colors cursor-pointer">
        {showEmbed ? (
          <div className="aspect-square relative bg-muted">
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={item.name || 'anon'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-4xl font-bold text-muted-foreground">
                {getFileExtension(item.name || 'anon')}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-square relative bg-muted flex items-center justify-center">
            <FileText className="h-16 w-16 text-muted-foreground" />
          </div>
        )}

        <CardHeader className="pb-3">
          <CardTitle className="text-base truncate">{item.name || 'anon'}</CardTitle>
          <div className="text-sm text-muted-foreground">
            by {item.user?.username || `Anon ${item.anonId}`}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {item.views}
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {item.commentCount}
            </div>
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              {item.karma}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

